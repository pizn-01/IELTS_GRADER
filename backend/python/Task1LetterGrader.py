import openai
import json
import argparse
import os
import sys
import re
import logging
import tiktoken
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from collections import defaultdict

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger(__name__)


def _load_repo_dotenv() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")


_load_repo_dotenv()

# ============================================================================
# MODEL CONFIGURATION
# ============================================================================
SCORING_MODEL_A        = "gpt-4.1"  # First scoring pass – complex structured JSON
SCORING_MODEL_B        = "gpt-5-mini"     # Second scoring pass – complex structured JSON
ERROR_DETECTION_MODEL  = "gpt-5.2"     # Per-criterion error detection – complex structured JSON
VOCABULARY_MODEL       = "gpt-5.2"  # Vocabulary JSON extraction – cheaper
GRAMMAR_MODEL          = "gpt-5-mini"  # Grammar JSON extraction – cheaper
REVISION_MODEL         = "gpt-5-mini"     # Band-9 revision – complex structured JSON
LETTER_STRUCTURE_MODEL = "gpt-5.2"     # Letter structure & task alignment analysis
FLOW_LOGIC_MODEL       = "gpt-5.2"     # Flo w & logic analysis

DEFAULT_MODEL = SCORING_MODEL_B  # gpt-4.1 – well-configured safe fallback

# Error detection temperature configuration
ERROR_DETECTION_TEMPERATURE_GPT4 = 0.2  # Comprehensive detection via strict taxonomy and detection hints

# ============================================================================
# ✅ COMPREHENSIVE ERROR TAXONOMY - PERFECT TASK 1 LETTER GRADING
# ============================================================================
ERROR_TAXONOMY = {
    "task_type": "IELTS Writing Task 1 - General (Letter)",
    "hierarchy": [
        {
            "official_criteria": "Task Achievement",
            "sub_categories": [
                {
                    "name": "Purpose",
                    "tags": [
                        {
                            "id": "purpose_unclear",
                            "label": "Purpose Unclear or Missing",
                            "severity": "major",
                            "band_impact": -1.5,
                            "description": "The purpose of the letter is not clearly stated in the opening paragraph.",
                            "detection_hint": "Check first 1-2 sentences. Should state: 'I am writing to...', 'I would like to...', 'This letter is to...'. Purpose must be immediately clear.",
                            "example_triggers": ["No clear purpose statement in opening", "Reader must guess why letter is written", "Purpose only clear from bullet points, not opening"]
                        },
                        {
                            "id": "purpose_not_maintained",
                            "label": "Purpose Not Maintained Throughout",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Letter starts with clear purpose but drifts or loses focus.",
                            "detection_hint": "Check if all paragraphs relate back to stated purpose. Look for tangents or irrelevant content. Also: judge across the FULL letter.",
                            "example_triggers": ["Starts as complaint but becomes chatty", "Mixes purposes (complaint + request + update)", "Loses thread of main purpose"]
                        }
                    ]
                },
                {
                    "name": "Tone",
                    "tags": [
                        {
                            "id": "tone_inappropriate",
                            "label": "Inappropriate Tone for Letter Type",
                            "severity": "major",
                            "band_impact": -1.5,
                            "description": "Tone does not match required letter type (formal/semi-formal/informal).",
                            "detection_hint": "FORMAL: no contractions, polite, professional vocabulary. SEMI-FORMAL: friendly but respectful, some contractions OK. INFORMAL: casual, contractions welcome. Check entire letter for consistency.",
                            "example_triggers": ["Slang in formal letter", "Overly stiff language in informal letter", "'Hey dude' in formal complaint"]
                        },
                        {
                            "id": "tone_inconsistent",
                            "label": "Inconsistent Tone",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Tone shifts between formal and informal within the letter.",
                            "detection_hint": "Check for: starting formal then using slang, mixing 'I would appreciate' with 'wanna', shifting from polite to aggressive. Also: compare tone across opening, body, and closing of the FULL letter.",
                            "example_triggers": ["'I am writing to express my concern... Anyway the thing was rubbish'", "Formal opening with casual closing", "Mix of contractions and formal phrases"]
                        },
                        {
                            "id": "incorrect_salutation",
                            "label": "Incorrect Salutation for Letter Type",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Using wrong salutation for the letter type.",
                            "detection_hint": "FORMAL to unknown: 'Dear Sir or Madam'/'Dear Sir/Madam'. FORMAL to known: 'Dear Mr/Ms [Surname]'. SEMI-FORMAL: 'Dear [First name]'. INFORMAL: 'Dear [First name]'/'Hi [First name]'.",
                            "example_triggers": ["'Hey' in formal letter", "'Dear Sir/Madam' in letter to friend", "Missing salutation entirely"]
                        },
                        {
                            "id": "incorrect_closing",
                            "label": "Incorrect Closing for Letter Type",
                            "severity": "high",
                            "band_impact": -0.75,
                            "description": "Wrong closing phrase or mismatched salutation-closing pair.",
                            "detection_hint": "CRITICAL PAIRINGS: 'Dear Sir/Madam' → 'Yours faithfully'. 'Dear Mr/Ms [Name]' → 'Yours sincerely'. Semi-formal → 'Kind regards'/'Best regards'. Informal → 'Best wishes'/'Warm regards'.",
                            "example_triggers": ["'Dear Sir/Madam' with 'Yours sincerely'", "'Yours faithfully' to named person", "Casual closing in formal letter"]
                        }
                    ]
                },
                {
                    "name": "Bullet Coverage",
                    "tags": [
                        {
                            "id": "bullet_point_missing",
                            "label": "Bullet Point Missing or Not Addressed",
                            "severity": "major",
                            "band_impact": -2.0,
                            "description": "One or more bullet points from the prompt are completely missing or barely mentioned.",
                            "detection_hint": "CRITICAL: Count bullet points in prompt vs letter. ALL must be present and clearly addressed. Missing even one bullet point = major penalty. Also: confirm the bullet is absent from the FULL letter before flagging.",
                            "example_triggers": ["Only 2 of 3 bullet points addressed", "Bullet point mentioned in passing only", "No clear response to specific bullet point"]
                        },
                        {
                            "id": "insufficient_bullet_development",
                            "label": "Insufficient Development of Bullet Point",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Bullet point mentioned but not adequately developed.",
                            "detection_hint": "Each bullet needs 2-3+ sentences with details. Single sentence responses or vague mentions = error. Also: read the FULL bullet section before flagging — never flag from one sentence if the same paragraph continues with detail.",
                            "example_triggers": ["'The product was broken. Please replace it.' (2 bullets in 2 sentences)", "Bullet answered in one sentence without detail", "Vague treatment without specifics"]
                        }
                    ]
                },
                {
                    "name": "Detail",
                    "tags": [
                        {
                            "id": "insufficient_supporting_detail",
                            "label": "Insufficient Supporting Detail",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Letter lacks adequate explanation, examples, or supporting information.",
                            "detection_hint": "Look for bare statements without context: 'It was bad' (what specifically?), 'I contacted them' (when? how? result?). Band 7+ needs: circumstances, timing, consequences, specifics. Also: read the FULL paragraph/bullet section before flagging.",
                            "example_triggers": ["'I am unhappy' (no explanation why)", "'Please help' (no details about what help needed)", "Generic statements without examples"]
                        },
                        {
                            "id": "irrelevant_detail",
                            "label": "Irrelevant or Off-topic Detail",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Content includes unnecessary information not related to the letter's purpose.",
                            "detection_hint": "Check for: memorized templates unconnected to scenario, personal tangents, addressing wrong scenario entirely.",
                            "example_triggers": ["Holiday stories in job application letter", "Life story in complaint letter", "Unrelated personal information"]
                        }
                    ]
                },
                {
                    "name": "Conclusion",
                    "tags": [
                        {
                            "id": "weak_or_missing_conclusion",
                            "label": "Weak or Missing Conclusion",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Letter lacks appropriate closing statement or ends abruptly.",
                            "detection_hint": "Check for: final sentence stating expectation/hope, appropriate sign-off phrase, name after sign-off. Formal letters typically end with 'I look forward to hearing from you' or similar.",
                            "example_triggers": ["Letter ends abruptly without closing statement", "No sign-off phrase before name", "Missing name after closing"]
                        },
                        {
                            "id": "inappropriate_closing_tone",
                            "label": "Inappropriate Closing Statement",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Closing statement doesn't match letter type or purpose.",
                            "detection_hint": "COMPLAINT: 'I trust this will be resolved promptly.' REQUEST: 'I would appreciate your assistance.' INFORMAL: 'Hope to hear from you soon!' Check tone matches opening.",
                            "example_triggers": ["'Thanks for everything!' in complaint", "'I demand immediate action' in friendly letter", "Closing tone mismatched with letter purpose"]
                        }
                    ]
                }
            ]
        },
        {
            "official_criteria": "Coherence & Cohesion",
            "sub_categories": [
                {
                    "name": "Structure",
                    "tags": [
                        {
                            "id": "poor_overall_structure",
                            "label": "Poor Overall Structure",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Letter lacks standard formatting (Salutation, Body, Closing).",
                            "detection_hint": "Missing salutation/closing or sections appearing in wrong order. Check: letter begins with 'Dear...' and ends with appropriate sign-off + name? Also: judge overall format across the FULL letter.",
                            "example_triggers": ["No 'Dear...' salutation", "No closing signature", "Body paragraphs before salutation"]
                        },
                        {
                            "id": "missing_paragraph_breaks",
                            "label": "Missing Paragraph Breaks",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Letter written as single block without paragraph separation.",
                            "detection_hint": "Task 1 letters should have: Opening (salutation + purpose), Body (2-3 paragraphs), Closing. Check for paragraph breaks.",
                            "example_triggers": ["Entire letter in one paragraph", "All three bullets in single paragraph"]
                        },
                        {
                            "id": "weak_topic_sentence",
                            "label": "Weak Topic Sentence",
                            "severity": "low",
                            "band_impact": -0.25,
                            "description": "Paragraphs don't clearly signal which bullet point they address.",
                            "detection_hint": "Each body paragraph should indicate which bullet it addresses in first sentence. E.g., 'I would like to describe the problem...', 'When I contacted your office...', 'I am requesting that...'",
                            "example_triggers": ["Unclear which bullet point paragraph addresses", "No signposting between bullets", "Paragraphs lack clear topic sentences"]
                        }
                    ]
                },
                {
                    "name": "Progression",
                    "tags": [
                        {
                            "id": "logical_progression_gap",
                            "label": "Logical Progression Gap",
                            "severity": "high",
                            "band_impact": -0.75,
                            "description": "Abrupt jumps between ideas without logical connection.",
                            "detection_hint": "Check continuity between sentences. Missing logical steps (e.g., 'Phone is broken. Send new one.' - missing: purchase details, warranty status, contact attempts). Band 7+: situation → impact → action → response → request.",
                            "example_triggers": ["'Item didn't work. I want refund.' (missing context)", "Jumping from problem to demand without explanation", "Ideas don't flow naturally"]
                        },
                        {
                            "id": "run_on",
                            "label": "Run-on / Fused Sentences",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Sentences joined without proper punctuation.",
                            "detection_hint": "Multiple independent clauses without conjunctions or punctuation. Look for: comma splices ('I called, nobody answered'), fused sentences (no punctuation between clauses).",
                            "example_triggers": ["'I received your letter it was kind' (needs period or conjunction)", "'I called the shop, nobody answered, I tried again' (comma splice)"]
                        },
                        {
                            "id": "fragment",
                            "label": "Sentence Fragment",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Incomplete sentences missing subject or main verb.",
                            "detection_hint": "Sentence without main verb or subject. Common in: sign-offs as standalone sentences ('Looking forward to hearing from you.' should be 'I look forward...'), bullet-point style writing.",
                            "example_triggers": ["'Looking forward to seeing you.' (missing 'I am')", "'Because of the delay.' (subordinate clause alone)", "'Very disappointed.' (no verb)"]
                        }
                    ]
                },
                {
                    "name": "Cohesive Devices",
                    "tags": [
                        {
                            "id": "overuse_linkers",
                            "label": "Overuse of Linking Words",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Excessive use of formal transition words, especially in informal/semi-formal letters.",
                            "detection_hint": "Count formal linkers: 'Furthermore', 'Moreover', 'In addition', 'Nevertheless'. FORMAL: appropriate. SEMI-FORMAL/INFORMAL: use 'Also', 'Plus', 'And', 'But', 'So'. >1 per paragraph = likely overuse.",
                            "example_triggers": ["'Furthermore' and 'Moreover' in friendly letter", "Every sentence starts with transition", "5+ formal linkers in 180-word letter"]
                        },
                        {
                            "id": "underuse_linkers",
                            "label": "Underuse of Linking Words",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Lack of transitions making letter feel disconnected.",
                            "detection_hint": "Complete absence of: 'However', 'Therefore', 'Also', 'So', 'Additionally', 'Nevertheless'. Letters need SOME connectors. Look for choppy, disconnected sentences.",
                            "example_triggers": ["Five sentences with no transitions", "Bullet-point style writing", "Ideas feel unconnected"]
                        },
                        {
                            "id": "inappropriate_linker_for_register",
                            "label": "Inappropriate Linker for Register",
                            "severity": "low",
                            "band_impact": -0.25,
                            "description": "Transition words don't match letter type.",
                            "detection_hint": "FORMAL: Furthermore, Moreover, In addition, Nevertheless, Consequently. INFORMAL: Also, Plus, Anyway, By the way, So. Check if linker matches tone.",
                            "example_triggers": ["'Moreover' in letter to friend", "'Anyway' in formal complaint"]
                        }
                    ]
                },
                {
                    "name": "Referencing",
                    "tags": [
                        {
                            "id": "unclear_referencing",
                            "label": "Unclear Referencing",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Pronouns like 'it', 'they', 'this', 'that' used without clear referent.",
                            "detection_hint": "Check every 'it', 'this', 'that', 'they', 'he', 'she'. Can reader definitively identify referent? Common issues: items, services, people, companies. Ambiguous pronouns = error.",
                            "example_triggers": ["'I saw manager and clerk, he told me to leave.' (who?)", "'They said it would be fixed.' (who is 'they'?)", "'This was unacceptable.' (what specifically?)"]
                        }
                    ]
                },
                {
                    "name": "Paragraphing",
                    "tags": [
                        {
                            "id": "paragraph_unity",
                            "label": "Paragraph Unity Failure",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Paragraph jumps between different bullet points or topics.",
                            "detection_hint": "Each paragraph should focus on ONE bullet point. Check for: mixing multiple requirements, abrupt topic shifts within paragraph. Ideal: 1 paragraph per bullet. Also: read the FULL paragraph before flagging.",
                            "example_triggers": ["Same paragraph discusses problem AND solution", "Paragraph addresses bullets 1 and 3, skips 2", "Multiple unrelated ideas in one paragraph"]
                        }
                    ]
                }
            ]
        },
        {
            "official_criteria": "Lexical Resource",
            "sub_categories": [
                {
                    "name": "Range",
                    "tags": [
                        {
                            "id": "repetition_basic_lexis",
                            "label": "Repetition of Basic Lexis",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Over-reliance on simple words (e.g., 'good', 'happy', 'sad', 'nice', 'bad').",
                            "detection_hint": "Count repetitions of same adjective/adverb: 3+ uses = error. Check: 'good' (use: satisfactory, excellent, appropriate), 'bad' (use: unsatisfactory, poor, inadequate), 'nice' (use: pleasant, enjoyable).",
                            "example_triggers": ["'nice' used 5 times", "'good' for everything positive", "Very limited descriptive vocabulary"]
                        },
                        {
                            "id": "insufficient_letter_vocabulary",
                            "label": "Insufficient Letter-Specific Vocabulary",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Lack of appropriate letter/correspondence vocabulary.",
                            "detection_hint": "Check for: FORMAL - 'I am writing to...', 'I would like to...', 'I trust that...'. REQUESTS - 'I would be grateful if...', 'Could you please...'. COMPLAINTS - 'unsatisfactory', 'inconvenience', 'disappointed', 'rectify'.",
                            "example_triggers": ["'I want' instead of 'I would like' in formal", "Basic vocabulary throughout", "Missing polite request structures"]
                        }
                    ]
                },
                {
                    "name": "Word Choice",
                    "tags": [
                        {
                            "id": "imprecise_word_choice",
                            "label": "Imprecise Word Choice",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Words don't quite fit the context.",
                            "detection_hint": "Look for: words too strong/weak for context. E.g., 'despise' when 'disappointed' fits, 'damaged' when 'broken', 'furious' when 'dissatisfied'. Check semantic appropriacy.",
                            "example_triggers": ["'I hate your service' (too emotional - use 'extremely dissatisfied')", "'The thing was broken' ('thing' too vague)"]
                        },
                        {
                            "id": "collocation",
                            "label": "Collocation Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Unnatural word combinations (e.g., 'do an apology', 'make a damage').",
                            "detection_hint": "Check common verb-noun pairs: 'make an appointment' (not 'do'), 'raise a concern' (not 'give'), 'submit a complaint' (not 'send'), 'offer an apology' (not 'give'), 'take action' (not 'make').",
                            "example_triggers": ["'make a damage' → 'cause damage'", "'do a complaint' → 'make/lodge complaint'", "'say an apology' → 'offer apology'"]
                        },
                        {
                            "id": "awkward_phrase",
                            "label": "Awkward Phrase",
                            "severity": "low",
                            "band_impact": -0.25,
                            "description": "Technically correct but unnatural in a letter.",
                            "detection_hint": "Check for: overly complex where simple works, direct translations, phrases native speakers wouldn't use. Common: 'I have the requirement of' → 'I require', 'I am in need of having' → 'I need'.",
                            "example_triggers": ["'I have the requirement of a refund' → 'I require a refund'", "'I am writing in order to make known' → 'to inform you'"]
                        },
                        {
                            "id": "wrong_word_form",
                            "label": "Wrong Word Form",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Wrong part of speech (adjective instead of adverb, noun instead of verb).",
                            "detection_hint": "Check: -ly adverbs vs adjectives, noun vs verb forms. Common: 'I am writing for a complain' (noun) → 'to complain' (verb), 'I look forward to receive' → 'receiving', 'response' vs 'respond'.",
                            "example_triggers": ["'for a complain' → 'to complain'/'a complaint'", "'your respond' → 'your response'", "'I am very disappoint' → 'disappointed'"]
                        },
                        {
                            "id": "typo_wordform",
                            "label": "Typo Affecting Word Form",
                            "severity": "low",
                            "band_impact": -0.25,
                            "description": "Typos creating different word form or meaning.",
                            "detection_hint": "Common: form/from, advice/advise, than/then, affect/effect. Check edit distance and meaning change.",
                            "example_triggers": ["'I received your advice' (meaning 'advise')", "'form the company' → 'from'", "'look forward to here' → 'hear'"]
                        }
                    ]
                },
                {
                    "name": "Register",
                    "tags": [
                        {
                            "id": "register_informal",
                            "label": "Inappropriate Register (Too Informal)",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Using slang or overly casual language in formal/semi-formal letter.",
                            "detection_hint": "FORMAL/SEMI-FORMAL should NOT have: contractions (I'm, don't, can't), slang (gonna, wanna, yeah), colloquialisms (stuff, things, lots of), phrasal verbs instead of formal verbs (put up with → tolerate).",
                            "example_triggers": ["'Hey man' in formal", "'gonna'/'wanna' in formal", "'I'm writing' → 'I am writing'", "'put up with' → 'tolerate'"]
                        },
                        {
                            "id": "register_overly_formal",
                            "label": "Inappropriate Register (Too Formal)",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Excessively formal or archaic language in informal/semi-formal letters.",
                            "detection_hint": "INFORMAL should NOT have: 'I am writing to inform you', 'I trust that', 'Yours faithfully', overly formal vocabulary. Should use: contractions OK, friendly tone, 'Hope to hear from you'.",
                            "example_triggers": ["'I am writing to inform you' to friend", "'I trust you are well' to close friend", "'Yours faithfully' in informal"]
                        },
                        {
                            "id": "register_inconsistency",
                            "label": "Register Inconsistency Within Letter",
                            "severity": "high",
                            "band_impact": -0.75,
                            "description": "Switching between formal and informal language.",
                            "detection_hint": "Check for tone shifts: starting formal then using slang, mixing contractions with formal phrases, switching from 'I would appreciate' to 'I want'. Register must be consistent.",
                            "example_triggers": ["'I am writing to express dissatisfaction... anyway thing was rubbish'", "Formal opening with informal closing", "Mixing 'would appreciate' with 'wanna'"]
                        }
                    ]
                },
                {
                    "name": "Paraphrasing",
                    "tags": [
                        {
                            "id": "copying_from_prompt",
                            "label": "Copying Directly from Prompt",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Direct copying of phrases from the prompt without paraphrasing.",
                            "detection_hint": "Check for exact phrases from prompt copied into letter. Candidates should restate using own words. Example: prompt says 'equipment for your kitchen' → should say 'kitchen appliance' or 'device'.",
                            "example_triggers": ["Exact phrases from prompt repeated", "No attempt to reword prompt language", "Prompt vocabulary copied verbatim"]
                        },
                        {
                            "id": "insufficient_paraphrasing",
                            "label": "Insufficient Paraphrasing",
                            "severity": "low",
                            "band_impact": -0.25,
                            "description": "Limited ability to express ideas in different ways.",
                            "detection_hint": "Check if candidate restates same idea using different words naturally. Look for variation in expressing similar concepts.",
                            "example_triggers": ["Repeating exact same phrases for same idea", "Unable to rephrase concepts", "Limited rewording ability"]
                        }
                    ]
                },
                {
                    "name": "Spelling",
                    "tags": [
                        {
                            "id": "misspelling",
                            "label": "Misspelling",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Systematic spelling errors, especially in common correspondence words.",
                            "detection_hint": "Common letter misspellings: 'sincerly' → 'sincerely', 'faithfull' → 'faithfully', 'recieve' → 'receive', 'seperate' → 'separate', 'occured' → 'occurred'. 3+ spelling errors = Band 5-6.",
                            "example_triggers": ["'sincerly' → 'sincerely'", "'faithfull' → 'faithfully'", "'accomodate' → 'accommodate'"]
                        },
                        {
                            "id": "spelling_closing_phrase",
                            "label": "Misspelling of Closing Phrase",
                            "severity": "high",
                            "band_impact": -0.75,
                            "description": "Misspelling standard closing phrases.",
                            "detection_hint": "Fixed phrases must be perfect: 'Yours sincerely', 'Yours faithfully', 'Best regards', 'Kind regards'. Common: 'Your sincerely' (missing 's'), 'Yours sincerly', 'Your's sincerely'.",
                            "example_triggers": ["'Your sincerely' (missing 's')", "'Yours sincerly'", "'Faithfully yours' (wrong order)"]
                        }
                    ]
                }
            ]
        },
        {
            "official_criteria": "Grammatical Range & Accuracy",
            "sub_categories": [
                {
                    "name": "Range",
                    "tags": [
                        {
                            "id": "limited_sentence_variety",
                            "label": "Limited Sentence Variety",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Over-reliance on simple sentence structures without attempting complex forms.",
                            "detection_hint": "Band 7+ letters should show: complex sentences (because, although, while, if), compound sentences (and, but, or), varied sentence openings. All simple sentences = Band 5-6 ceiling. 10+ simple sentences in a row = error. Also: judge variety across the FULL letter (pattern-across-text), not one sentence.",
                            "example_triggers": ["Entire letter in simple Subject-Verb-Object", "No subordinators (because, although, when, if)", "No complex structures attempted"]
                        }
                    ]
                },
                {
                    "name": "Accuracy",
                    "tags": [
                        {
                            "id": "subject_verb_agreement",
                            "label": "Subject-Verb Agreement",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Subject and verb don't match in number.",
                            "detection_hint": "Check EVERY verb. Common errors: plural subject + singular verb, collective nouns (staff are/is), compound subjects (X and Y are). Watch third person singular present (he/she/it + -s).",
                            "example_triggers": ["'The staff is unhelpful' → 'are'", "'She want a refund' → 'wants'", "'The products was damaged' → 'were'"]
                        },
                        {
                            "id": "article_determiner",
                            "label": "Article/Determiner Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Incorrect use or omission of 'a', 'an', or 'the'.",
                            "detection_hint": "Rules: Singular countable nouns need 'a/an/the'. Plural/uncountable: no article OR 'the' if specific. First mention: 'a/an'. Subsequent: 'the'. Check every noun.",
                            "example_triggers": ["'I have problem' → 'a problem'", "'I bought the phone yesterday' (first mention) → 'a phone'", "'I received letter' → 'letter'/'a letter'"]
                        },
                        {
                            "id": "tense_aspect",
                            "label": "Tense/Aspect Error",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Incorrect timeline in the letter.",
                            "detection_hint": "Check alignment with time markers: 'yesterday' + past tense, 'currently' + present. Letters typically: past (problem), present (current situation), future (requesting action). 'I go there yesterday' = major error.",
                            "example_triggers": ["'I go there yesterday' → 'went'", "'Last week I am writing' → 'wrote'", "'I will be grateful if you called' → 'would be'"]
                        },
                        {
                            "id": "plural_singular",
                            "label": "Plural/Singular Form Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Errors in noun number or uncountable nouns.",
                            "detection_hint": "Uncountable: information, advice, furniture, luggage, equipment, weather, news (singular, no -s). Countable: need plural with numbers/many/several.",
                            "example_triggers": ["'many advice' → 'much advice'", "'informations' → 'information'", "'I need two informations' → 'pieces of information'"]
                        },
                        {
                            "id": "preposition",
                            "label": "Preposition Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Wrong choice of preposition in common letter phrases.",
                            "detection_hint": "Letter-specific: 'I am writing to you', 'responsible for', 'complain about', 'apologize for', 'apply for', 'interested in', 'look forward to', 'on time', 'in time', 'at the moment'.",
                            "example_triggers": ["'responsible of' → 'for'", "'complain for' → 'about'", "'apologize about' → 'for'", "'look forward for' → 'to'"]
                        },
                        {
                            "id": "pronoun_case",
                            "label": "Pronoun Case Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Using subject pronouns instead of object pronouns or vice versa.",
                            "detection_hint": "Subject: I, he, she, we, they. Object: me, him, her, us, them. Check after prepositions (to me, with her), as objects (called him).",
                            "example_triggers": ["'between you and I' → 'me'", "'important for she' → 'her'", "'send it to they' → 'them'"]
                        },
                        {
                            "id": "word_order",
                            "label": "Word Order Error",
                            "severity": "high",
                            "band_impact": -0.75,
                            "description": "Sentence elements out of order, especially in indirect questions.",
                            "detection_hint": "CRITICAL: Indirect questions: 'Could you tell me where IT IS' (not 'where IS IT'). Check: 'I would like to know when...', 'Could you inform me how...', 'Please let me know why...'. Also: adverb placement, adjective order.",
                            "example_triggers": ["'Could you tell me where is the office?' → 'where the office is'", "'I want to know when will you deliver' → 'when you will deliver'"]
                        },
                        {
                            "id": "modal_verb_error",
                            "label": "Modal Verb Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Incorrect use of modal verbs, especially in polite requests.",
                            "detection_hint": "Polite requests: 'Could you...?', 'Would you...?', 'I would like...', 'I would appreciate if you could...'. Errors: double modals, wrong modal for context, forgetting bare infinitive after modal.",
                            "example_triggers": ["'Can you could send' (double modal)", "'I would like to can' → 'to be able to'", "'I must to go' → 'must go'"]
                        }
                    ]
                },
                {
                    "name": "Punctuation",
                    "tags": [
                        {
                            "id": "capitalization",
                            "label": "Capitalization Error",
                            "severity": "low",
                            "band_impact": -0.25,
                            "description": "Missing capitals at sentence start or for proper names.",
                            "detection_hint": "Check: sentence-initial capitals, 'I' always capitalized, proper nouns (names, places, companies, months), salutation capitals ('Dear Sir' not 'dear sir').",
                            "example_triggers": ["'dear sir' → 'Dear Sir'", "'i am writing' → 'I am'", "'in january' → 'January'", "'yours sincerely' → 'Yours sincerely'"]
                        },
                        {
                            "id": "punctuation_comma",
                            "label": "Comma Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Missing commas in lists, after introductory phrases, or after salutations.",
                            "detection_hint": "LETTER-SPECIFIC: comma after 'Dear [Name]' in informal/semi-formal. Comma after introductory phrases: 'However,', 'Therefore,', 'Furthermore,'. Comma in lists. Comma after long introductory clauses.",
                            "example_triggers": ["'Dear John [no comma]' in informal", "'However I would like' → 'However, I would like'", "'bread milk and eggs' → 'bread, milk, and eggs'"]
                        },
                        {
                            "id": "punctuation_sentence_boundary",
                            "label": "Sentence Boundary Error",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Missing full stops between distinct thoughts.",
                            "detection_hint": "Run-on sentences missing periods. Independent clauses joined without conjunction or punctuation. Check for: multiple verbs indicating separate thoughts without periods.",
                            "example_triggers": ["'I am writing to you I want a refund.' (needs period)", "'I called nobody answered.' → 'I called. Nobody answered.'"]
                        },
                        {
                            "id": "punctuation_apostrophe",
                            "label": "Apostrophe Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Incorrect use of apostrophes, especially possessive vs plural or contractions.",
                            "detection_hint": "Common: 'its' (possessive) vs 'it's' (it is), 'your' vs 'you're', 'their/there/they're'. Plural nouns DON'T need apostrophes. Closing phrases: 'Yours' (not 'Your's').",
                            "example_triggers": ["'Your sincerely' → 'Yours sincerely'", "'Its broken' → 'It's'", "'Your welcome' → 'You're'", "'apple's' (plural) → 'apples'"]
                        }
                    ]
                },
                {
                    "name": "Complexity",
                    "tags": [
                        {
                            "id": "modifier_error",
                            "label": "Modifier Error (Dangling/Misplaced)",
                            "severity": "medium",
                            "band_impact": -0.75,
                            "description": "Unclear modifiers making descriptions ambiguous.",
                            "detection_hint": "Participial phrases must modify subject of main clause. Check: 'Being a loyal customer, THE SERVICE should be better' (service isn't customer). Look for: -ing phrases, -ed phrases without clear subject reference.",
                            "example_triggers": ["'Being loyal customer, service should be better.' → 'As I am loyal customer, service...'", "'Having paid in full, delay is unacceptable.' (delay didn't pay)"]
                        },
                        {
                            "id": "parallelism",
                            "label": "Parallelism Error",
                            "severity": "low",
                            "band_impact": -0.25,
                            "description": "Inconsistent structure in list of requests or complaints.",
                            "detection_hint": "Items in list should have same grammatical form. Check lists: 'to refund, to replace, to apologize' OR 'refunding, replacing, apologizing' - not mixed.",
                            "example_triggers": ["'I want a refund, returning the item, and an apology.' → 'refund, return, apology'", "'I enjoy reading, to write, swimming.' → 'reading, writing, swimming'"]
                        }
                    ]
                },
                {
                    "name": "Consistency",
                    "tags": [
                        {
                            "id": "tense_consistency",
                            "label": "Tense Consistency Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Inconsistent tense usage within related sentences or paragraphs.",
                            "detection_hint": "Check for unnecessary tense shifts: describing past event should stay in past, current situation in present. Look for: 'I bought it and then I go home' (shift from past to present).",
                            "example_triggers": ["'I bought the item and then I go home' (inconsistent)", "'I am writing because I received... and I will be very angry' (mixing tenses inappropriately)"]
                        },
                        {
                            "id": "subject_verb_consistency",
                            "label": "Subject-Verb Consistency Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Changing subject-verb patterns inconsistently.",
                            "detection_hint": "Check for consistent treatment of similar structures throughout letter. Look for: starting formal then becoming informal, mixing singular/plural inconsistently.",
                            "example_triggers": ["Inconsistent treatment of 'staff' (sometimes singular, sometimes plural)", "Mixing sentence patterns randomly"]
                        }
                    ]
                }
            ]
        }
    ]
}

# Sub-item to error mapping (Task 1 - General Letter)
SUB_ITEM_ERROR_MAPPING = {
    "Task Achievement": {
        "Purpose": ["purpose_unclear", "purpose_not_maintained"],
        "Tone": ["tone_inappropriate", "tone_inconsistent", "incorrect_salutation", "incorrect_closing"],
        "Bullet Coverage": ["bullet_point_missing", "insufficient_bullet_development"],
        "Detail": ["insufficient_supporting_detail", "irrelevant_detail"],
        "Conclusion": ["weak_or_missing_conclusion", "inappropriate_closing_tone"]
    },
    "Coherence & Cohesion": {
        "Structure": ["poor_overall_structure", "missing_paragraph_breaks", "weak_topic_sentence"],
        "Progression": ["logical_progression_gap", "run_on", "fragment"],
        "Cohesive Devices": ["overuse_linkers", "underuse_linkers", "inappropriate_linker_for_register"],
        "Referencing": ["unclear_referencing"],
        "Paragraphing": ["paragraph_unity"]
    },
    "Lexical Resource": {
        "Range": ["repetition_basic_lexis", "insufficient_letter_vocabulary"],
        "Word Choice": ["imprecise_word_choice", "collocation", "awkward_phrase", "wrong_word_form", "typo_wordform"],
        "Register": ["register_informal", "register_overly_formal", "register_inconsistency"],
        "Paraphrasing": ["copying_from_prompt", "insufficient_paraphrasing"],
        "Spelling": ["misspelling", "spelling_closing_phrase"]
    },
    "Grammatical Range & Accuracy": {
        "Range": ["limited_sentence_variety"],
        "Accuracy": ["subject_verb_agreement", "article_determiner", "tense_aspect", "plural_singular", "preposition", "pronoun_case", "word_order", "modal_verb_error"],
        "Punctuation": ["capitalization", "punctuation_comma", "punctuation_sentence_boundary", "punctuation_apostrophe"],
        "Complexity": ["modifier_error", "parallelism"],
        "Consistency": ["tense_consistency", "subject_verb_consistency"]
    }
}

# ============================================================================
# ROBUST JSON REPAIR UTILITIES (no external dependencies required)
# ============================================================================

def _attempt_json_repair(raw_text: str) -> Optional[dict]:
    """
    Multi-strategy JSON repair without external libraries.
    Tries increasingly aggressive fixes before giving up.
    """
    if not raw_text:
        return None

    # Strategy 1 – strip markdown fences
    stripped = re.sub(r'^```(?:json)?\s*', '', raw_text.strip(), flags=re.MULTILINE)
    stripped = re.sub(r'\s*```$', '', stripped.strip(), flags=re.MULTILINE)

    for candidate in [stripped, raw_text]:
        # Strategy 2 – direct parse
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

        # Strategy 3 – extract outermost {...}
        match = re.search(r'(\{.*\})', candidate, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        # Strategy 4 – remove trailing commas before } or ]
        try:
            fixed = re.sub(r',\s*([}\]])', r'\1', candidate)
            return json.loads(fixed)
        except json.JSONDecodeError:
            pass

        # Strategy 5 – remove trailing commas AND fix single-quoted strings
        try:
            fixed = re.sub(r',\s*([}\]])', r'\1', candidate)
            fixed = fixed.replace("'", '"')
            return json.loads(fixed)
        except json.JSONDecodeError:
            pass

        # Strategy 6 – truncate at last valid closing brace
        last_brace = candidate.rfind('}')
        if last_brace != -1:
            truncated = candidate[:last_brace + 1]
            try:
                return json.loads(truncated)
            except json.JSONDecodeError:
                pass

    return None


# ============================================================================
# MAIN GRADER CLASS
# ============================================================================

class IELTSLetterGrader:
    def __init__(self, api_key):
        self.client = openai.AsyncOpenAI(api_key=api_key)
        try:
            self.encoding = tiktoken.encoding_for_model("gpt-4o")
        except KeyError:
            self.encoding = tiktoken.get_encoding("cl100k_base")
        self.error_taxonomy = ERROR_TAXONOMY
        self._taxonomy_cache: Dict[str, str] = {}

    # ------------------------------------------------------------------
    # UTILITY METHODS
    # ------------------------------------------------------------------

    def _count_tokens(self, text: str) -> int:
        return len(self.encoding.encode(text))

    def _get_model_config(self, model: str) -> Dict[str, Any]:
        """Get model-specific configuration parameters."""
        if model.startswith("gpt-5"):
            return {
                "temperature": 1.0,
                "max_completion_tokens": 16000,
                "supports_json_mode": True,
            }
        elif model.startswith("gpt-4"):
            return {
                "temperature": 0.23,
                "max_tokens": 4000,
                "supports_json_mode": True,
            }
        elif model == "gpt-3.5-turbo":
            return {
                "temperature": 0.23,
                "max_tokens": 2000,
                "supports_json_mode": True,
            }
        else:
            return {
                "temperature": 0.23,
                "max_tokens": 4000,
                "supports_json_mode": False,
            }

    async def _call_ai(
        self,
        system_prompt: str,
        user_prompt: str,
        task_name: str = "Task",
        model: str = DEFAULT_MODEL,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        json_mode: bool = False,
    ) -> str:
        """Call the OpenAI API with model-specific configuration."""
        input_tokens = self._count_tokens(system_prompt + user_prompt)
        logger.info(f"Calling AI [{model}] for {task_name}... (Input tokens: {input_tokens})")

        model_config = self._get_model_config(model)
        final_temperature = temperature if temperature is not None else model_config["temperature"]

        kwargs: Dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            "temperature": final_temperature,
            "timeout": 120,
        }

        if "max_completion_tokens" in model_config:
            final_max_tokens = max_tokens if max_tokens is not None else model_config["max_completion_tokens"]
            kwargs["max_completion_tokens"] = final_max_tokens
        else:
            final_max_tokens = max_tokens if max_tokens is not None else model_config["max_tokens"]
            kwargs["max_tokens"] = final_max_tokens

        if json_mode and model_config.get("supports_json_mode", False):
            kwargs["response_format"] = {"type": "json_object"}

        try:
            response = await self.client.chat.completions.create(**kwargs)
            return response.choices[0].message.content.strip()
        except openai.BadRequestError as e:
            if json_mode and "response_format" in kwargs:
                logger.warning(f"json_mode not supported for {model}, retrying without it. ({e})")
                kwargs.pop("response_format", None)
                response = await self.client.chat.completions.create(**kwargs)
                return response.choices[0].message.content.strip()
            raise
        except Exception as e:
            logger.error(f"Error in {task_name}: {str(e)}")
            raise

    def _clean_json(self, text: str) -> dict:
        """Parse JSON from model output using multi-strategy repair."""
        result = _attempt_json_repair(text)
        if result is not None:
            return result
        logger.error(f"All JSON repair strategies failed. Raw text snippet: {text[:300]}...")
        return {}

    # ------------------------------------------------------------------
    # TAXONOMY REFERENCE GENERATORS (with caching)
    # ------------------------------------------------------------------

    def _generate_full_taxonomy_reference(self) -> str:
        return self._generate_criterion_taxonomy_reference(None)

    def _generate_criterion_taxonomy_reference(self, criterion_name: Optional[str]) -> str:
        """Generate a formatted taxonomy reference for a SINGLE criterion or ALL criteria."""
        cache_key = criterion_name or "ALL"
        if cache_key in self._taxonomy_cache:
            return self._taxonomy_cache[cache_key]

        ref = "=== IELTS TASK 1 LETTER ERROR TAXONOMY ===\n\n"
        for criterion in self.error_taxonomy["hierarchy"]:
            if criterion_name and criterion["official_criteria"] != criterion_name:
                continue
            ref += f"**{criterion['official_criteria'].upper()}**\n\n"
            for sub_cat in criterion["sub_categories"]:
                ref += f"  → {sub_cat['name']}\n"
                for tag in sub_cat["tags"]:
                    ref += f"    • [{tag['severity'].upper()}] {tag['label']} (ID: {tag['id']})\n"
                    ref += f"      Description: {tag['description']}\n"
                    ref += f"      Impact: {tag['band_impact']}\n"
                    ref += f"      Detection: {tag['detection_hint']}\n"
                    ref += f"      Examples: {', '.join(tag['example_triggers'])}\n\n"
            ref += "\n"

        self._taxonomy_cache[cache_key] = ref
        return ref

    # ------------------------------------------------------------------
    # PER-CRITERION ERROR DETECTION (4 focused passes)
    # ------------------------------------------------------------------

    async def _detect_errors_for_criterion(
        self, user_answer: str, letter_prompt: str, criterion_name: str
    ) -> List[dict]:
        """Run ONE focused error-detection pass for a SINGLE IELTS criterion."""
        taxonomy_ref = self._generate_criterion_taxonomy_reference(criterion_name)

        system_prompt = f"""You are a forensic IELTS Task 1 Letter error specialist trained to find every deviation
from perfect IELTS letter-writing standards.

YOUR SINGLE FOCUS TODAY: **{criterion_name}**

This is your ONLY task. Be exhaustively thorough for this criterion.

YOUR GOAL: Find every genuine error — major and minor.

# ACCURACY RULES:
- Only use error IDs that exist in the taxonomy below — no invented categories
- If something is acceptable for the letter's register, do NOT flag it
- Quote EXACTLY from the letter text (verbatim 3-10 words)

# COMPLETENESS RULES:
- Check EVERY sentence, EVERY word for this criterion
- Minor errors (low severity) still count — include them
- There is no floor or ceiling on error count — report exactly what exists

CONTEXT SCOPE BY ERROR TYPE (additive — apply ONLY to the listed IDs; do not change how other tags are judged):
- SHORT-SPAN (default for most tags — phrase/sentence): grammar, punctuation, spelling, articles, prepositions, word form, imprecise_word_choice, collocation, awkward_phrase, incorrect_salutation, incorrect_closing, and similar local tags.
- PARAGRAPH / BULLET-SECTION SCOPE IDs only (read the FULL section before flagging): insufficient_bullet_development, insufficient_supporting_detail, paragraph_unity, logical_progression_gap, weak_topic_sentence.
- WHOLE-LETTER SCOPE IDs only (read the FULL letter before flagging): bullet_point_missing, purpose_unclear, purpose_not_maintained, tone_inconsistent, register_inconsistency, weak_or_missing_conclusion, poor_overall_structure.
- PATTERN-ACROSS-TEXT IDs only (scan full text for frequency/range patterns): limited_sentence_variety, insufficient_letter_vocabulary, repetition_basic_lexis, overuse_linkers, underuse_linkers.
- insufficient_bullet_development / insufficient_supporting_detail only: a statement is NOT underdeveloped if the same paragraph (or bullet section) continues with context, timing, specifics, or examples. Only flag when that section as a WHOLE lacks support.

# CRITICAL LETTER-SPECIFIC CHECKS:
For {criterion_name}, you MUST verify:
"""

        # ✅ ORIGINAL TASK 1 LETTER: Letter-specific validation requirements
        if criterion_name == "Task Achievement":
            system_prompt += """
- PURPOSE: Clearly stated in opening paragraph? ('I am writing to...')
- TONE: Matches letter type (formal/semi-formal/informal) throughout?
- BULLET COVERAGE: ALL bullet points addressed with 2-3+ sentences each?
- DETAIL: Each bullet has context, specifics, timing, examples?
- CONCLUSION: Appropriate closing statement + correct sign-off + name?
- insufficient_bullet_development only: read the FULL bullet section before flagging — do not flag if the same paragraph continues with detail
"""
        elif criterion_name == "Coherence & Cohesion":
            system_prompt += """
- STRUCTURE: Correct format (Salutation → Body → Closing → Sign-off → Name)?
- PROGRESSION: Ideas flow logically within each paragraph?
- COHESIVE DEVICES: Appropriate for letter type (formal vs informal)?
- REFERENCING: All pronouns clear?
- PARAGRAPHING: Each paragraph covers ONE bullet point only?
"""
        elif criterion_name == "Lexical Resource":
            system_prompt += """
- RANGE: Variety? Letter-specific vocabulary used?
- WORD CHOICE: Precise? Correct collocations?
- REGISTER: Consistent formality throughout?
- PARAPHRASING: Not copying from prompt?
- SPELLING: All words correct, especially closing phrases?
"""
        elif criterion_name == "Grammatical Range & Accuracy":
            system_prompt += """
- RANGE: Mix of structures (simple, compound, complex)?
- ACCURACY: Verbs, articles, tenses, prepositions correct?
- PUNCTUATION: Capitals, commas, periods, apostrophes correct?
- COMPLEXITY: Complex structures used and controlled?
- CONSISTENCY: Tenses consistent throughout?
"""

        system_prompt += """

CRITICAL OUTPUT RULES:
- Return ONLY a valid JSON object
- Every "original_text" must be a verbatim quote of 3–10 words from the letter
- Every error must map to a tag ID from the taxonomy below
"""

        user_prompt = f"""
LETTER PROMPT:
{letter_prompt}

USER LETTER:
{user_answer}

{taxonomy_ref}

For EACH error you find, provide exactly these fields:
- error_id        : Exact tag ID from the taxonomy above
- error_label     : Label from the taxonomy
- official_criteria : Must be "{criterion_name}"
- sub_category    : Exact sub-category name from the taxonomy
- severity        : major | high | medium | low
- band_impact     : Numeric value from the taxonomy (negative float)
- location        : e.g. "Paragraph 2, Sentence 3" or "Opening salutation" or "Closing phrase"
- original_text   : EXACT verbatim quote (3–10 words) from the letter
- corrected_text  : The corrected version
- explanation     : Clear, specific reason this is an error for Task 1 letters
- context         : Brief surrounding context helping the reader find it

Return ONLY a JSON object:
{{
  "errors": [
    {{
      "error_id": "...",
      "error_label": "...",
      "official_criteria": "{criterion_name}",
      "sub_category": "...",
      "severity": "...",
      "band_impact": -0.5,
      "location": "...",
      "original_text": "...",
      "corrected_text": "...",
      "explanation": "...",
      "context": "..."
    }}
  ]
}}

ZERO-ERROR GUARD: If you are about to return an empty errors list, STOP.
Re-read the letter one more time looking specifically for:
  1. Any imprecise or repeated vocabulary
  2. Any missing comma after 'However', 'Therefore', 'Furthermore', etc.
  3. Any vague pronoun reference ('this', 'it', 'they') without a clear antecedent
  4. Any paragraph whose topic sentence is weak or vague
  5. Any salutation-closing pair mismatch
If the letter is genuinely error-free for this criterion, return {{"errors": []}} — but only then.
"""

        _detection_model_config = self._get_model_config(ERROR_DETECTION_MODEL)
        _detection_temp = (
            _detection_model_config["temperature"]
            if _detection_model_config["temperature"] == 1.0
            else ERROR_DETECTION_TEMPERATURE_GPT4
        )

        raw = await self._call_ai(
            system_prompt,
            user_prompt,
            task_name=f"ErrorDetection-{criterion_name}",
            model=ERROR_DETECTION_MODEL,
            temperature=_detection_temp,
            max_tokens=6000,
            json_mode=True,
        )
        parsed = self._clean_json(raw)
        errors = parsed.get("errors", [])
        logger.info(f"  → [{criterion_name}] {len(errors)} error(s) detected.")
        return errors

    # ------------------------------------------------------------------
    # SCORING – SPLIT HELPERS (latency optimisation)
    # ------------------------------------------------------------------

    async def _perform_scoring_for_criteria_subset(
        self,
        user_answer: str,
        letter_prompt: str,
        criteria_subset: List[str],
        model: str = SCORING_MODEL_A,
    ) -> dict:
        """Score a subset of criteria (for parallel Model A calls)."""
        system_prompt = f"""You are a senior IELTS examiner with 20+ years of experience specializing in
Task 1 General Training letters. You are scoring with {model}.

Provide detailed band scores (0.5 increments from 1.0 to 9.0) for:
1. Each MAIN criterion (listed below)
2. Each SUB-CATEGORY within each criterion

Be SPECIFIC and DETAILED. Provide concrete evidence and quotes from the letter.
Your scores must REFLECT THE ACTUAL QUALITY — do not default to middle scores.

⚠️ CRITICAL CALIBRATION:
- Score based on OVERALL CONTROL and SOPHISTICATION, not just error counting
- Band 6 = ADEQUATE and APPROPRIATE (competent but not sophisticated)
- Band 7 = GOOD CONTROL with variety and sophistication
- Do NOT inflate Band 6 letters to Band 7

✅ OFFICIAL IELTS TASK 1 LETTER BAND CALIBRATION:

TASK ACHIEVEMENT (Letter-Specific)
  Band 9 : Purpose crystal clear from opening; perfect tone match; all bullets fully addressed with rich detail (3-4 sentences each); compelling closing with correct sign-off
  Band 8 : Clear purpose; appropriate tone; all bullets well-addressed; very minor gaps; correct salutation-closing pair
  Band 7 : Clear purpose; generally appropriate tone; all bullets addressed adequately; closing present and appropriate
  Band 6 : Purpose stated; tone mostly appropriate; all bullets addressed but some inadequately; closing present but may be weak
  Band 5 : Purpose may be unclear; tone inconsistencies; some bullets not fully addressed; closing weak
  Band 4 : Unclear purpose; inappropriate tone; minimal bullet coverage; closing absent or inappropriate

COHERENCE & COHESION (Letter-Specific)
  Band 9 : Perfect format; flawless salutation-closing pairing; seamless flow; all referencing clear
  Band 8 : Well-formatted; correct salutation/closing; good progression; cohesion rarely faulty
  Band 7 : Clear structure; appropriate salutation/closing; logical progression; occasional over/under-use of devices
  Band 6 : Basic structure; salutation/closing present (may be slightly incorrect); mechanical connectives; minor referencing issues
  Band 5 : Structure issues; wrong salutation/closing pairing; limited devices; referencing confusion
  Band 4 : Weak structure; missing/incorrect salutation/closing; poor flow

LEXICAL RESOURCE (Letter-Specific)
  Band 9 : Full flexibility; precise collocations; varied language; perfect register; letter phrases used naturally
  Band 8 : Wide appropriate vocabulary; register well-maintained; occasional minor errors; letter conventions controlled
  Band 7 : Sufficient range; good variety; generally correct register; some errors in word choice; letter phrases used well
  Band 6 : Adequate vocabulary; noticeable repetition but acceptable; register mostly appropriate; errors present but clear
  Band 5 : Limited range; basic vocabulary only; frequent repetition; register inconsistent; letter conventions weak
  Band 4 : Very limited range; errors in basic vocabulary; inappropriate register

GRAMMATICAL RANGE & ACCURACY (Letter-Specific)
  Band 9 : Full range appropriate for letters; rare errors; indirect questions perfect; wide variety
  Band 8 : Wide range; majority error-free; occasional slips in complex structures
  Band 7 : Variety with good control; errors infrequent; uses complex forms successfully
  Band 6 : Mix of simple and complex; adequate control; noticeable errors but communication clear
  Band 5 : Limited range; errors frequent; may cause difficulty
  Band 4 : Very limited; errors dominate; communication impeded

IMPORTANT:
- Check salutation-closing pairing explicitly
- Score what you actually read
- Band 4–5 and Band 8–9 are vastly different — scores must reflect this"""

        _criteria_desc: Dict[str, str] = {
            "Task Achievement": """**TASK ACHIEVEMENT** – assess these 5 sub-categories:
  • Purpose: Clear statement of purpose in opening?
  • Tone: Appropriate formality for letter type throughout?
  • Bullet Coverage: ALL bullet points addressed with sufficient detail?
  • Detail: Adequate supporting information for each point?
  • Conclusion: Appropriate closing statement and sign-off?""",
            "Coherence & Cohesion": """**COHERENCE & COHESION** – assess these 5 sub-categories:
  • Structure: Correct format (salutation, body, closing)? Proper organization?
  • Progression: Logical flow of ideas sentence to sentence?
  • Cohesive Devices: Appropriate linking words for letter type?
  • Referencing: Clear pronouns and references throughout?
  • Paragraphing: Unified paragraphs, one bullet point per paragraph?""",
            "Lexical Resource": """**LEXICAL RESOURCE** – assess these 5 sub-categories:
  • Range: Sufficient variety? Letter-specific vocabulary present?
  • Word Choice: Precise words? Correct collocations?
  • Register: Formality matches letter type consistently?
  • Paraphrasing: Rewording from prompt, not direct copying?
  • Spelling: All words correct, including closing phrases?""",
            "Grammatical Range & Accuracy": """**GRAMMATICAL RANGE & ACCURACY** – assess these 5 sub-categories:
  • Range: Mix of simple, compound, complex sentences?
  • Accuracy: Subject-verb agreement, articles, tenses, prepositions correct?
  • Punctuation: Capitals, commas, full stops appropriate?
  • Complexity: Complex structures attempted and controlled?
  • Consistency: Tenses and forms consistent throughout?""",
        }

        _criteria_schema: Dict[str, str] = {
            "Task Achievement": (
                '  "Task Achievement": {{\n'
                '    "overall_score": 0.0,\n'
                '    "overall_justification": "...",\n'
                '    "sub_categories": {{\n'
                '      "Purpose":         {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Tone":            {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Bullet Coverage": {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Detail":          {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Conclusion":      {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}}\n'
                '    }}\n'
                '  }}'
            ),
            "Coherence & Cohesion": (
                '  "Coherence & Cohesion": {{\n'
                '    "overall_score": 0.0,\n'
                '    "overall_justification": "...",\n'
                '    "sub_categories": {{\n'
                '      "Structure":        {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Progression":      {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Cohesive Devices": {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Referencing":      {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Paragraphing":     {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}}\n'
                '    }}\n'
                '  }}'
            ),
            "Lexical Resource": (
                '  "Lexical Resource": {{\n'
                '    "overall_score": 0.0,\n'
                '    "overall_justification": "...",\n'
                '    "sub_categories": {{\n'
                '      "Range":        {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Word Choice":  {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Register":     {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Paraphrasing": {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Spelling":     {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}}\n'
                '    }}\n'
                '  }}'
            ),
            "Grammatical Range & Accuracy": (
                '  "Grammatical Range & Accuracy": {{\n'
                '    "overall_score": 0.0,\n'
                '    "overall_justification": "...",\n'
                '    "sub_categories": {{\n'
                '      "Range":       {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Accuracy":    {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Punctuation": {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Complexity":  {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Consistency": {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}}\n'
                '    }}\n'
                '  }}'
            ),
        }

        descriptions_block = "\n\n".join(_criteria_desc[c] for c in criteria_subset)
        schema_entries      = ",\n".join(_criteria_schema[c] for c in criteria_subset)

        user_prompt = f"""
LETTER PROMPT: {letter_prompt}

USER LETTER:
{user_answer}

Provide a holistic assessment. For each criterion and sub-category below,
give: score, strengths, weaknesses, and evidence (specific quotes from the letter).

BREVITY RULE (strictly enforced to limit response size):
  • strengths  : max 65 words — specific observation explaining WHY the writing is strong here
  • weaknesses : max 65 words — specific observation explaining exactly what goes wrong and why it matters
  • evidence   : max 20 words — verbatim quote from essay only, no commentary
  • overall_justification : max 70 words

{descriptions_block}

Return ONLY a valid JSON object exactly matching this structure:
{{
{schema_entries}
}}
"""
        raw = await self._call_ai(
            system_prompt,
            user_prompt,
            task_name=f"Scoring-{model}-[{','.join(criteria_subset)}]",
            model=model,
            max_tokens=5000,
            json_mode=True,
        )
        result = self._clean_json(raw)
        logger.info(f"  → Scoring Model A [{','.join(criteria_subset)}] complete.")
        return result

    # ------------------------------------------------------------------
    # DUAL SCORING WITH EMBEDDED SUMMARY (Model B – holistic pass)
    # ------------------------------------------------------------------

    async def _perform_detailed_independent_scoring(
        self, user_answer: str, letter_prompt: str, model: str = SCORING_MODEL_B
    ) -> dict:
        """Ultra-detailed holistic scoring for IELTS Task 1 Letters (Model B)."""
        include_summary = (model == SCORING_MODEL_B)

        system_prompt = f"""You are a senior IELTS examiner with 20+ years of experience specializing in
Task 1 General Training letters. You are scoring with {model}.

Provide detailed band scores (0.5 increments from 1.0 to 9.0) for:
1. Each MAIN criterion (4 total)
2. Each SUB-CATEGORY within each criterion

Be SPECIFIC and DETAILED. Provide concrete evidence and quotes from the letter.
Your scores must REFLECT THE ACTUAL QUALITY — do not default to middle scores.

⚠️ CRITICAL CALIBRATION — Use Qualitative Assessment:
- Score based on OVERALL CONTROL and SOPHISTICATION, not just error counting
- Band 6 = ADEQUATE and APPROPRIATE (competent but not sophisticated)
- Band 7 = GOOD CONTROL with variety and sophistication
- Do NOT inflate Band 6 letters to Band 7
- Errors should be noted but interpreted in context of overall performance

✅ OFFICIAL IELTS TASK 1 LETTER BAND CALIBRATION:

TASK ACHIEVEMENT
  Band 9 : Purpose crystal clear from opening; perfect tone match; all bullets fully addressed with rich detail (3-4 sentences each); compelling closing with correct sign-off
  Band 8 : Clear purpose; appropriate tone; all bullets well-addressed; very minor gaps; correct salutation-closing pair
  Band 7 : Clear purpose; generally appropriate tone; all bullets addressed adequately; closing present and appropriate
  Band 6 : Purpose stated; tone mostly appropriate; all bullets addressed but some inadequately; closing present but may be weak
  Band 5 : Purpose may be unclear; tone inconsistencies; some bullets not fully addressed; closing weak
  Band 4 : Unclear purpose; inappropriate tone; minimal bullet coverage; closing absent or inappropriate

COHERENCE & COHESION
  Band 9 : Perfect format; flawless salutation-closing pairing; seamless flow; all referencing clear
  Band 8 : Well-formatted; correct salutation/closing; good progression; cohesion rarely faulty
  Band 7 : Clear structure; appropriate salutation/closing; logical progression; occasional over/under-use of devices
  Band 6 : Basic structure; salutation/closing present (may be slightly incorrect); mechanical connectives; minor referencing issues
  Band 5 : Structure issues; wrong salutation/closing pairing; limited devices; referencing confusion
  Band 4 : Weak structure; missing/incorrect salutation/closing; poor flow

LEXICAL RESOURCE
  Band 9 : Full flexibility; precise collocations; varied language; perfect register; letter phrases used naturally
  Band 8 : Wide appropriate vocabulary; register well-maintained; occasional minor errors; letter conventions controlled
  Band 7 : Sufficient range; good variety; generally correct register; some errors in word choice; letter phrases used well
  Band 6 : Adequate vocabulary; noticeable repetition but acceptable; register mostly appropriate; errors present but clear
  Band 5 : Limited range; basic vocabulary only; frequent repetition; register inconsistent; letter conventions weak
  Band 4 : Very limited range; errors in basic vocabulary; inappropriate register

GRAMMATICAL RANGE & ACCURACY
  Band 9 : Full range appropriate for letters; rare errors; indirect questions perfect; wide variety
  Band 8 : Wide range; majority error-free; occasional slips in complex structures
  Band 7 : Variety with good control; errors infrequent; uses complex forms successfully
  Band 6 : Mix of simple and complex; adequate control; noticeable errors but communication clear
  Band 5 : Limited range; errors frequent; may cause difficulty
  Band 4 : Very limited; errors dominate; communication impeded

⚠️ BAND 6 vs BAND 7 DIFFERENTIATION:
Band 7 = Good control + variety + sophistication
Band 6 = Adequate control + some variety + competent but basic

IMPORTANT:
- Check salutation-closing pairing explicitly
- Score what you actually read
- Band 4–5 and Band 8–9 are vastly different — scores must reflect this"""

        if not include_summary:
            # ── Model A path: full narratives, no summary ─────────────────────────
            user_prompt = f"""
LETTER PROMPT: {letter_prompt}

USER LETTER:
{user_answer}

Provide a DETAILED holistic assessment. For each criterion and sub-category below,
give: score, strengths, weaknesses, and evidence (specific quotes from the letter).

BREVITY RULE (strictly enforced to limit response size):
  • strengths  : max 35 words — one sharp observation only
  • weaknesses : max 35 words — one sharp observation only
  • evidence   : max 20 words — verbatim quote from letter only, no commentary
  • overall_justification : max 55 words

**TASK ACHIEVEMENT** – assess these 5 sub-categories:
  • Purpose: Clear statement of purpose in opening?
  • Tone: Appropriate formality for letter type throughout?
  • Bullet Coverage: ALL bullet points addressed with sufficient detail?
  • Detail: Adequate supporting information for each point?
  • Conclusion: Appropriate closing statement and sign-off?

**COHERENCE & COHESION** – assess these 5 sub-categories:
  • Structure: Correct format (salutation, body, closing)? Proper organization?
  • Progression: Logical flow of ideas sentence to sentence?
  • Cohesive Devices: Appropriate linking words for letter type?
  • Referencing: Clear pronouns and references throughout?
  • Paragraphing: Unified paragraphs, one bullet point per paragraph?

**LEXICAL RESOURCE** – assess these 5 sub-categories:
  • Range: Sufficient variety? Letter-specific vocabulary present?
  • Word Choice: Precise words? Correct collocations?
  • Register: Formality matches letter type consistently?
  • Paraphrasing: Rewording from prompt, not direct copying?
  • Spelling: All words correct, including closing phrases?

**GRAMMATICAL RANGE & ACCURACY** – assess these 5 sub-categories:
  • Range: Mix of simple, compound, complex sentences?
  • Accuracy: Subject-verb agreement, articles, tenses, prepositions correct?
  • Punctuation: Capitals, commas, full stops appropriate?
  • Complexity: Complex structures attempted and controlled?
  • Consistency: Tenses and forms consistent throughout?

Return ONLY a valid JSON object exactly matching this structure:
{{
  "Task Achievement": {{
    "overall_score": 0.0,
    "overall_justification": "...",
    "sub_categories": {{
      "Purpose":         {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Tone":            {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Bullet Coverage": {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Detail":          {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Conclusion":      {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}}
    }}
  }},
  "Coherence & Cohesion": {{
    "overall_score": 0.0,
    "overall_justification": "...",
    "sub_categories": {{
      "Structure":        {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Progression":      {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Cohesive Devices": {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Referencing":      {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Paragraphing":     {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}}
    }}
  }},
  "Lexical Resource": {{
    "overall_score": 0.0,
    "overall_justification": "...",
    "sub_categories": {{
      "Range":        {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Word Choice":  {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Register":     {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Paraphrasing": {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Spelling":     {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}}
    }}
  }},
  "Grammatical Range & Accuracy": {{
    "overall_score": 0.0,
    "overall_justification": "...",
    "sub_categories": {{
      "Range":       {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Accuracy":    {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Punctuation": {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Complexity":  {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Consistency": {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}}
    }}
  }}
}}
"""

        else:
            # ── Model B path: scores only + overall_summary ───────────────────────
            user_prompt = f"""
LETTER PROMPT: {letter_prompt}

USER LETTER:
{user_answer}

Your two tasks:

1. Write an OVERALL SUMMARY of exactly 5 to 7 complete sentences, covering ALL four criteria (Task Achievement,
   Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy).
   For each criterion mention one key strength AND one primary weakness in plain language.
   Do NOT include any band scores or numeric grades in the summary — qualitative only.
   Note any letter format issues (salutation/closing pairing, tone consistency, bullet coverage).

2. Score each criterion (overall_score + overall_justification) and each
   sub-category (score only — no narratives needed).

BREVITY RULE: overall_justification for each criterion: max 35 words.

**TASK ACHIEVEMENT** – sub-categories: Purpose, Tone, Bullet Coverage, Detail, Conclusion
**COHERENCE & COHESION** – sub-categories: Structure, Progression, Cohesive Devices, Referencing, Paragraphing
**LEXICAL RESOURCE** – sub-categories: Range, Word Choice, Register, Paraphrasing, Spelling
**GRAMMATICAL RANGE & ACCURACY** – sub-categories: Range, Accuracy, Punctuation, Complexity, Consistency

Return ONLY a valid JSON object exactly matching this structure:
{{
  "overall_summary": "5-7 sentence overall assessment covering all four criteria with specific strengths and weaknesses for each...",
  "Task Achievement": {{
    "overall_score": 0.0,
    "overall_justification": "...",
    "sub_categories": {{
      "Purpose":         {{"score": 0.0}},
      "Tone":            {{"score": 0.0}},
      "Bullet Coverage": {{"score": 0.0}},
      "Detail":          {{"score": 0.0}},
      "Conclusion":      {{"score": 0.0}}
    }}
  }},
  "Coherence & Cohesion": {{
    "overall_score": 0.0,
    "overall_justification": "...",
    "sub_categories": {{
      "Structure":        {{"score": 0.0}},
      "Progression":      {{"score": 0.0}},
      "Cohesive Devices": {{"score": 0.0}},
      "Referencing":      {{"score": 0.0}},
      "Paragraphing":     {{"score": 0.0}}
    }}
  }},
  "Lexical Resource": {{
    "overall_score": 0.0,
    "overall_justification": "...",
    "sub_categories": {{
      "Range":        {{"score": 0.0}},
      "Word Choice":  {{"score": 0.0}},
      "Register":     {{"score": 0.0}},
      "Paraphrasing": {{"score": 0.0}},
      "Spelling":     {{"score": 0.0}}
    }}
  }},
  "Grammatical Range & Accuracy": {{
    "overall_score": 0.0,
    "overall_justification": "...",
    "sub_categories": {{
      "Range":       {{"score": 0.0}},
      "Accuracy":    {{"score": 0.0}},
      "Punctuation": {{"score": 0.0}},
      "Complexity":  {{"score": 0.0}},
      "Consistency": {{"score": 0.0}}
    }}
  }}
}}
"""

        raw = await self._call_ai(
            system_prompt,
            user_prompt,
            task_name=f"Scoring-{model}",
            model=model,
            max_tokens=3000,
            json_mode=True,
        )
        return self._clean_json(raw)

    def _average_two_scoring_rounds(self, round_a: dict, round_b: dict) -> dict:
        """
        Average the OVERALL and SUB-CATEGORY scores from two independent scoring rounds.
        Simple averaging identical to Task 2 grader.
        """
        criteria_list = [
            "Task Achievement",
            "Coherence & Cohesion",
            "Lexical Resource",
            "Grammatical Range & Accuracy",
        ]
        averaged: dict = {}
        for criterion in criteria_list:
            data_a = round_a.get(criterion, {})
            data_b = round_b.get(criterion, {})
            score_a = float(data_a.get("overall_score", 6.0))
            score_b = float(data_b.get("overall_score", 6.0))

            # ── Simple average — identical to Task 2 grader ──────────────────────
            avg_overall = self._round_to_half_band((score_a + score_b) / 2.0)

            just_a = data_a.get("overall_justification", "")
            just_b = data_b.get("overall_justification", "")
            merged_justification = (
                f"[Model A] {just_a}  [Model B] {just_b}"
                if just_a != just_b else just_a
            )

            subcats_a = data_a.get("sub_categories", {})
            subcats_b = data_b.get("sub_categories", {})
            all_subcat_keys = set(subcats_a.keys()) | set(subcats_b.keys())

            merged_subcats: dict = {}
            for subcat in all_subcat_keys:
                sc_a = subcats_a.get(subcat, {})
                sc_b = subcats_b.get(subcat, {})
                sc_score_a = float(sc_a.get("score", avg_overall))
                sc_score_b = float(sc_b.get("score", avg_overall))

                avg_subcat = self._round_to_half_band((sc_score_a + sc_score_b) / 2.0)

                merged_subcats[subcat] = {
                    "score":       avg_subcat,
                    "score_a":     sc_score_a,
                    "score_b":     sc_score_b,
                    "strengths":   sc_a.get("strengths",   ""),
                    "weaknesses":  sc_a.get("weaknesses",  ""),
                    "evidence":    sc_a.get("evidence",    ""),
                    "strengths_b":  sc_b.get("strengths",  ""),
                    "weaknesses_b": sc_b.get("weaknesses", ""),
                    "evidence_b":   sc_b.get("evidence",   ""),
                }

            averaged[criterion] = {
                "overall_score":         avg_overall,
                "overall_score_a":       score_a,
                "overall_score_b":       score_b,
                "overall_justification": merged_justification,
                "sub_categories":        merged_subcats,
            }

        return averaged

    def _build_final_scores_from_dual_rounds(self, averaged_scores: dict) -> dict:
        """Extract clean category-level scores from the averaged dual scoring rounds."""
        criteria_scores: Dict[str, float] = {}
        for criterion, data in averaged_scores.items():
            criteria_scores[criterion] = float(data.get("overall_score", 6.0))

        if criteria_scores:
            overall_avg = sum(criteria_scores.values()) / len(criteria_scores)
            overall_band = self._round_to_half_band(overall_avg)
        else:
            overall_band = 6.0

        return {"overall_band": overall_band, "criteria_scores": criteria_scores}

    # ------------------------------------------------------------------
    # SUB-CATEGORY SCORING
    # ------------------------------------------------------------------

    def _calculate_sub_item_scores_with_reranker(
        self,
        criteria_name: str,
        errors: List[dict],
        category_score: float,
        averaged_scoring: dict,
    ) -> Dict[str, float]:
        """Calculate sub-item scores by starting from averaged score and applying error penalty."""
        sub_item_scores: Dict[str, float] = {}
        sub_item_mapping = SUB_ITEM_ERROR_MAPPING.get(criteria_name, {})
        averaged_subcats = averaged_scoring.get(criteria_name, {}).get("sub_categories", {})

        max_allowed = min(category_score + 1.5, 9.0)
        min_allowed = max(category_score - 1.5, 1.0)

        for sub_item, error_ids in sub_item_mapping.items():
            matching_errors = [e for e in errors if e.get("error_id") in error_ids]
            avg_subcat_data = averaged_subcats.get(sub_item, {})
            base_score = float(avg_subcat_data.get("score", category_score))

            error_penalty = 0.0
            for err in matching_errors:
                sev = err.get("severity", "medium")
                if sev == "major":
                    error_penalty += 0.5
                elif sev == "high":
                    error_penalty += 0.3
                elif sev == "medium":
                    error_penalty += 0.2
                else:
                    error_penalty += 0.1

            penalised_score = base_score - min(error_penalty, 1.5)
            final = max(min_allowed, min(max_allowed, penalised_score))
            sub_item_scores[sub_item] = self._round_to_half_band(final)

        if criteria_name == "Grammatical Range & Accuracy" and "Range" in sub_item_mapping:
            avg_range_data = averaged_subcats.get("Range", {})
            range_base = float(avg_range_data.get("score", category_score))
            range_final = max(min_allowed, min(max_allowed, range_base))
            sub_item_scores["Range"] = self._round_to_half_band(range_final)

        return sub_item_scores

    def _generate_merged_feedback(
            self,
            criteria_name: str,
            errors: List[dict],
            sub_item_scores: Dict[str, float],
            averaged_scoring: dict,
        ) -> str:
            feedback_lines: List[str] = []
            sub_item_mapping = SUB_ITEM_ERROR_MAPPING.get(criteria_name, {})
            averaged_subcats = averaged_scoring.get(criteria_name, {}).get("sub_categories", {})

            for sub_item, error_ids in sub_item_mapping.items():
                matching_errors = [e for e in errors if e.get("error_id") in error_ids]
                score = sub_item_scores.get(sub_item, 9.0)
                avg_data = averaged_subcats.get(sub_item, {})

                strengths  = (avg_data.get("strengths")  or "").strip().rstrip(".")
                weaknesses = (avg_data.get("weaknesses") or "").strip().rstrip(".")

                # Collect error explanations — no text truncation, no raw correction pairs
                error_explanations: List[str] = []
                for err in matching_errors[:3]:
                    expl = (err.get("explanation") or "").strip()
                    if expl:
                        error_explanations.append(expl)

                # ── Build the core observation — natural language, no evidence quotes ──
                if score >= 7.0:
                    if strengths:
                        observation = f"{strengths}."
                    else:
                        observation = "This sub-criterion is handled competently and with control."
                    if error_explanations:
                        observation += f" One minor point to address: {error_explanations[0]}."

                elif score >= 5.5:
                    if strengths and weaknesses:
                        observation = f"{strengths}. However, {weaknesses.lower()}."
                    elif weaknesses:
                        observation = f"{weaknesses}."
                    elif strengths:
                        observation = f"{strengths}, though there is clear room for further development."
                    else:
                        observation = "Performance here is adequate but inconsistent, with noticeable room for improvement."
                    if error_explanations:
                        count  = len(matching_errors)
                        plural = "issue" if count == 1 else "issues"
                        observation += f" {count} {plural} were flagged: {error_explanations[0]}."
                        if len(error_explanations) > 1:
                            observation += f" Additionally, {error_explanations[1][0].lower() + error_explanations[1][1:]}."

                else:
                    if weaknesses:
                        observation = f"{weaknesses}."
                    else:
                        observation = "Significant development is needed in this area."
                    if error_explanations:
                        count  = len(matching_errors)
                        plural = "issue" if count == 1 else "issues"
                        observation += (
                            f" {count} {plural} were identified. "
                            f"Most critically: {error_explanations[0]}."
                        )
                        if len(error_explanations) > 1:
                            observation += f" A further problem: {error_explanations[1][0].lower() + error_explanations[1][1:]}."
                    if strengths:
                        observation += f" On a positive note, {strengths.lower()}."

                feedback_lines.append(f"• {sub_item} (Band {score}): {observation}")

            return "\n".join(feedback_lines)

    # ------------------------------------------------------------------
    # SCORING UTILITIES
    # ------------------------------------------------------------------

    def _round_to_half_band(self, score: float) -> float:
        """Round to nearest 0.5 IELTS band."""
        whole = int(score)
        decimal = score - whole
        if decimal < 0.25:
            return float(whole)
        elif decimal < 0.75:
            return whole + 0.5
        else:
            return float(whole + 1)

    # ------------------------------------------------------------------
    # DETAILED FEEDBACK GENERATION
    # ------------------------------------------------------------------

    async def _generate_detailed_feedback(
        self,
        user_answer: str,
        letter_prompt: str,
        error_data: dict,
        final_scores: dict,
        averaged_scoring: dict,
    ) -> dict:
        """Build the per-criterion breakdown."""
        errors_by_criteria: Dict[str, List[dict]] = {}
        for error in error_data.get("errors", []):
            crit = error.get("official_criteria", "")
            if crit not in errors_by_criteria:
                errors_by_criteria[crit] = []
            errors_by_criteria[crit].append(error)

        breakdown: dict = {}
        for criteria_name in [
            "Task Achievement",
            "Coherence & Cohesion",
            "Lexical Resource",
            "Grammatical Range & Accuracy",
        ]:
            criteria_errors = errors_by_criteria.get(criteria_name, [])
            overall_score   = final_scores["criteria_scores"].get(criteria_name, 6.0)
            sub_item_scores = self._calculate_sub_item_scores_with_reranker(
                criteria_name, criteria_errors, overall_score, averaged_scoring,
            )
            feedback = self._generate_merged_feedback(
                criteria_name, criteria_errors, sub_item_scores, averaged_scoring,
            )
            sub_item_mapping = SUB_ITEM_ERROR_MAPPING.get(criteria_name, {})
            sub_items_list = [
                sub_item_scores.get(sub_item, overall_score)
                for sub_item in sub_item_mapping.keys()
            ]
            breakdown[criteria_name] = {
                "score":     overall_score,
                "sub_items": sub_items_list,
                "feedback":  feedback,
            }

        return {"breakdown": breakdown}

    # ------------------------------------------------------------------
    # REVISION (Band 9 model letter)
    # ------------------------------------------------------------------

    async def _generate_revision(
            self,
            user_answer: str,
            letter_prompt: str,
            letter_type: str = "formal",
        ) -> dict:
        """Generate an improved version of the student's letter with honest band scoring."""
        system_prompt = "You are an expert IELTS examiner and accomplished letter-writing specialist."
        user_prompt = f"""
    LETTER PROMPT: {letter_prompt}
    LETTER TYPE: {letter_type}

    ORIGINAL STUDENT LETTER:
    {user_answer}

    TASK: Improve the student's letter above — do NOT write a new letter from scratch.
    Preserve the student's core ideas, intent, and general content.
    Apply targeted corrections and upgrades in these areas:
    • Fix the salutation and closing phrase if they don't match the {letter_type} register
        (e.g. formal: "Dear Mr Smith / Yours sincerely", semi-formal/informal: "Dear John / Best wishes")
    • Correct any bullet points that are underdeveloped — each should have 2–3 sentences of support
    • Fix grammatical errors (tense, agreement, articles, prepositions)
    • Replace vocabulary that is too informal/formal for a {letter_type} letter
    • Improve sentence flow and cohesive devices appropriate to the register
    • Fix punctuation, spelling, and layout (date, address block if formal)
    • Ensure the opening paragraph clearly states the letter's purpose

    After revising, estimate the IELTS band score the improved letter would achieve (use 0.5 increments, 1.0–9.0).
    Base this honestly on the quality of the revised text — do NOT default to 9.0.

    For "key_improvements", list exactly 5 specific changes you made — each must reference
    what was wrong in the original and what was done to fix it in the revised version.
    Examples of good improvement entries:
    - "Corrected closing from 'Yours faithfully' to 'Yours sincerely' because the salutation used the recipient's name"
    - "Expanded bullet point 2 from one vague sentence to three sentences with specific detail"
    - "Replaced informal phrase 'I want to tell you' with 'I am writing to inform you' to match formal register"
    - "Added clear purpose statement in the opening paragraph which was missing in the original"
    - "Fixed subject-verb agreement error: 'the facilities was' → 'the facilities were'"

    Return ONLY a valid JSON object:
    {{
    "revision": "The full improved letter text here, preserving the student's ideas...",
    "revised_score_line": "Improved Letter (Band X.X)",
    "word_count": 175,
    "key_improvements": [
        "Specific change 1: what was wrong → what was fixed",
        "Specific change 2: what was wrong → what was fixed",
        "Specific change 3: what was wrong → what was fixed",
        "Specific change 4: what was wrong → what was fixed",
        "Specific change 5: what was wrong → what was fixed"
    ]
    }}
    """
        raw = await self._call_ai(
            system_prompt, user_prompt,
            task_name="Revision",
            model=REVISION_MODEL,
            json_mode=True,
        )
        result = self._clean_json(raw)
        logger.info("  → Revision complete.")
        return result

    # ------------------------------------------------------------------
    # VOCABULARY – 3 PARALLEL BATCHES
    # ------------------------------------------------------------------

    async def _generate_vocabulary_batch(
        self,
        user_answer: str,
        letter_prompt: str,
        batch_number: int,
        category_focus: str,
        category_labels: List[str],
        letter_type: str = "formal",
    ) -> List[dict]:
        """
        Generate one batch of ~10 high-level vocabulary items focused on
        specific lexical categories for IELTS Task 1 letters.
        Three batches run in parallel and are merged to produce 30 total items.
        """
        vocab_system = (
            "You are an IELTS Vocabulary Enhancement Specialist for Task 1 General Training letters. "
            "Your task is to provide targeted Band 8–9 vocabulary specifically for LETTER WRITING. "
            "Respond only with a valid JSON object."
        )

        category_list_str = "\n".join(f"  - {c}" for c in category_labels)

        vocab_user = f"""
LETTER PROMPT: {letter_prompt}
USER LETTER: {user_answer}
LETTER TYPE: {letter_type}

TASK: Generate EXACTLY 10 high-level vocabulary items from the following categories ONLY:
{category_list_str}

STRICT RULES:
1. Every item MUST fall into one of the categories listed above — use those exact category names.
2. Every item MUST be completely absent from the user's letter.
3. Every item MUST be directly relevant to the letter topic AND appropriate for a {letter_type} letter.
4. Distribute items across ALL listed categories (do not concentrate on one category).
5. Each item must be at Band 8–9 level — sophisticated, precise, and appropriate for correspondence.

Return ONLY a valid JSON object:
{{
  "vocabulary_enhancements": [
    {{
      "word": "I would be grateful if you could",
      "type": "phrase",
      "definition": "formal polite request structure appropriate for formal letters",
      "example": "I would be grateful if you could arrange for a full refund at your earliest convenience.",
      "category": "{category_labels[0]}"
    }}
  ]
}}

Generate EXACTLY 10 items. No more, no less.
"""
        raw = await self._call_ai(
            vocab_system, vocab_user,
            task_name=f"Vocabulary-Batch{batch_number}",
            model=VOCABULARY_MODEL,
            json_mode=True,
        )
        result = self._clean_json(raw)
        items = result.get("vocabulary_enhancements", [])
        logger.info(f"  → Vocabulary Batch {batch_number} complete: {len(items)} words.")
        return items

    async def _generate_vocabulary(self, user_answer: str, letter_prompt: str, letter_type: str = "formal") -> dict:
        """
        Runs 3 parallel vocabulary batch calls (10 items each) then merges
        and deduplicates to produce 30 high-level suggestions covering:
          Batch 1 → Letter Opening Phrases & Closing Phrases
          Batch 2 → Complaint/Request/Apology Vocabulary & Formal Adjectives
          Batch 3 → Cohesive Expressions & Advanced Letter Structures
        """
        batch_configs = [
            {
                "batch_number": 1,
                "category_focus": "Letter Opening & Closing Phrases",
                "category_labels": ["Letter Opening Phrases", "Letter Closing Phrases"],
            },
            {
                "batch_number": 2,
                "category_focus": "Topic-Specific Letter Vocabulary",
                "category_labels": ["Topic-Specific Nouns & Verbs", "Formal Adjectives & Adverbs"],
            },
            {
                "batch_number": 3,
                "category_focus": "Advanced Letter Structures & Cohesive Expressions",
                "category_labels": ["Advanced Letter Structures", "Cohesive Expressions for Letters"],
            },
        ]

        batch_results = await asyncio.gather(*[
            self._generate_vocabulary_batch(
                user_answer, letter_prompt,
                cfg["batch_number"], cfg["category_focus"], cfg["category_labels"],
                letter_type=letter_type,
            )
            for cfg in batch_configs
        ])

        seen_words: set = set()
        merged: List[dict] = []
        for batch_items in batch_results:
            for item in (batch_items or []):
                word_key = (item.get("word") or "").lower().strip()
                if word_key and word_key not in seen_words:
                    seen_words.add(word_key)
                    merged.append(item)

        logger.info(f"  → Vocabulary merged: {len(merged)} unique items from 3 batches.")
        return {"vocabulary_enhancements": merged}

    # ============================================================================
    # LETTER STRUCTURE ANALYSIS (equivalent to Argumentation Analysis in Task 2)
    # Covers: opening/salutation, bullet development mapping, closing quality,
    # task alignment, tone consistency, authenticity & letter conventions
    # ============================================================================

    async def _analyze_letter_structure_formal(
        self, user_answer: str, letter_prompt: str, letter_type: str = "formal"
    ) -> dict:
        """
        Parallel split 1/2 of letter structure analysis.
        Covers: opening_analysis, bullet_development_map, closing_analysis.
        Returns keys: opening_analysis, bullet_development_map, closing_analysis.
        """
        system_prompt = f"""You are an IELTS Task 1 Letter structure expert analyzing letter architecture and task fulfillment.

Your task: Assess the structural architecture of the letter — opening, bullet point development, and closing.

CRITICAL: You are NOT detecting grammar/vocabulary errors. Focus ONLY on:
1. Opening/salutation structure (purpose stated? salutation correct? register set?)
2. Bullet point development mapping (each bullet addressed with sufficient depth?)
3. Closing quality (sign-off correct? closing statement appropriate? name present?)

For IELTS Task 1 {letter_type} letters, strong letters have:
- Clear purpose stated in the opening paragraph
- Correct salutation for the letter type
- Each bullet point addressed with 3-4 sentences including context, details, and consequences
- Appropriate closing statement matching the letter's purpose
- Correct salutation-closing phrase pairing
- Writer's name after the closing phrase"""

        user_prompt = f"""
LETTER PROMPT: {letter_prompt}
LETTER TYPE: {letter_type}

USER LETTER:
{user_answer}

Analyze the structural elements of this letter:

═══════════════════════════════════════════════════════════════════════════
1. OPENING / SALUTATION ANALYSIS
═══════════════════════════════════════════════════════════════════════════

Analyze the opening section:

**Salutation:**
- Is the salutation present? (Yes / No)
- Is it correct for a {letter_type} letter? (Correct / Incorrect / Missing)
- What salutation was used? (quote exactly)
- What salutation should have been used?

**Purpose Statement:**
- Is the purpose of the letter clearly stated? (Clear / Vague / Missing)
- Where is it located? (First sentence / Second sentence / Not found)
- Quote the purpose statement if present

**Register Established:**
- Does the opening set the correct register for a {letter_type} letter? (Yes / Partial / No)
- Any tone mismatches in the opening?

**Overall Opening Quality:** Rate 1-5 stars
**Recommendation:** How to improve the opening

═══════════════════════════════════════════════════════════════════════════
2. BULLET POINT DEVELOPMENT MAP
═══════════════════════════════════════════════════════════════════════════

For EACH bullet point from the prompt, assess development quality:

**Bullet Point Text:** (what the prompt requires)

**Addressed:** Yes / Partially / No

**Development Depth:**
★☆☆☆☆ = Not addressed or single word mention
★★☆☆☆ = Mentioned in one sentence only, no detail
★★★☆☆ = Two sentences, some context but limited detail
★★★★☆ = Three sentences with context, specifics, and impact
★★★★★ = Four+ sentences: situation, details, consequences, and clear request/response

**Specificity Level:**
- Generic: No specific details, could apply to any letter
- Developing: Some specifics but missing context or consequences
- Specific: Clear details with context, timing, and impact

**Missing Elements:** What additional detail would strengthen this bullet response?

**Overall Bullet Strength Score:** Rate 1.0–9.0 (IELTS band equivalent)

**Actionable Recommendation:** Specific improvement suggestion with example language

═══════════════════════════════════════════════════════════════════════════
3. CLOSING ANALYSIS
═══════════════════════════════════════════════════════════════════════════

Analyze the closing section:

**Closing Statement:**
- Is there an appropriate closing sentence/paragraph? (Yes / Partial / No)
- Does it match the letter's purpose? (COMPLAINT: 'I trust this will be resolved promptly.' REQUEST: 'I look forward to hearing from you.')
- Quote the closing statement if present

**Sign-off Phrase:**
- What sign-off was used? (quote exactly)
- Is it correct for a {letter_type} letter? (Correct / Incorrect / Missing)
- What sign-off should have been used?
- Is the salutation-closing pairing correct? ('Dear Sir/Madam' → 'Yours faithfully' / 'Dear [Name]' → 'Yours sincerely')

**Writer's Name:**
- Is the writer's name present after the sign-off? (Yes / No)

**Overall Closing Quality:** Rate 1-5 stars
**Recommendation:** How to improve the closing

═══════════════════════════════════════════════════════════════════════════

Return ONLY valid JSON matching this exact structure:

{{
  "opening_analysis": {{
    "salutation_present": true,
    "salutation_correct": "Correct",
    "salutation_used": "Dear Sir or Madam,",
    "salutation_should_be": "Dear Sir or Madam,",
    "purpose_clarity": "Clear",
    "purpose_location": "First sentence",
    "purpose_quote": "I am writing to complain about the quality of a product I recently purchased from your store.",
    "register_established": "Yes",
    "register_issues": null,
    "overall_quality_stars": 4,
    "strengths": ["Clear purpose stated immediately", "Correct formal salutation"],
    "weaknesses": ["Could include reference number or purchase date in opening"],
    "recommendation": "Add purchase details: 'I am writing regarding order #12345, placed on 5 January 2024, to complain about...'"
  }},
  "bullet_development_map": [
    {{
      "bullet_number": 1,
      "bullet_text": "describe the problem with the product",
      "addressed": "Yes",
      "development_stars": 3,
      "development_text": "Two sentences describing the damage but without specific dates or purchase context",
      "specificity_level": "Developing",
      "specificity_note": "Describes what happened but not when, where purchased, or impact on writer",
      "missing_elements": [
        "Purchase date or product name",
        "How the defect was discovered",
        "Impact or inconvenience caused"
      ],
      "strength_score": 6.0,
      "recommendation": "Add: 'The television I purchased on 3 February 2024 stopped working after just two days. When I turned it on, the screen displayed a series of horizontal lines, making it completely unusable. This has caused considerable inconvenience as I had specifically purchased it for an important occasion.'"
    }}
  ],
  "closing_analysis": {{
    "closing_statement_present": "Yes",
    "closing_matches_purpose": "Yes",
    "closing_statement_quote": "I look forward to hearing from you at your earliest convenience.",
    "signoff_used": "Yours sincerely,",
    "signoff_correct": "Correct",
    "signoff_should_be": "Yours sincerely,",
    "salutation_closing_pairing_correct": true,
    "pairing_note": "Used 'Dear Mr Johnson' → 'Yours sincerely' — correct pairing",
    "name_present": true,
    "overall_quality_stars": 4,
    "strengths": ["Correct sign-off for named recipient", "Appropriate closing statement"],
    "weaknesses": ["Closing statement is generic; could reference specific resolution"],
    "recommendation": "Strengthen closing: 'I would appreciate a full replacement or refund, and I trust this matter will be resolved within 14 days.'"
  }}
}}

REMEMBER: Return ONLY the JSON object, nothing else.
"""
        raw = await self._call_ai(
            system_prompt, user_prompt,
            task_name="LetterStructureFormal",
            model=LETTER_STRUCTURE_MODEL,
            json_mode=True,
        )
        result = self._clean_json(raw)
        logger.info(f"  → Letter structure formal complete: "
                    f"{len(result.get('bullet_development_map', []))} bullets mapped, "
                    f"Opening {result.get('opening_analysis', {}).get('overall_quality_stars', 'N/A')}★, "
                    f"Closing {result.get('closing_analysis', {}).get('overall_quality_stars', 'N/A')}★")
        return result

    async def _analyze_letter_structure_analytical(
        self, user_answer: str, letter_prompt: str, letter_type: str = "formal"
    ) -> dict:
        """
        Parallel split 2/2 of letter structure analysis.
        Covers: task_alignment, tone_consistency, authenticity, overall_summary.
        Returns keys: task_alignment, tone_consistency, authenticity, overall_summary.
        """
        system_prompt = f"""You are an IELTS Task 1 Letter expert analyzing task alignment, tone, and authenticity.

Your task: Assess the analytical quality of the letter — task alignment, tone consistency, and authenticity.

CRITICAL: You are NOT detecting grammar/vocabulary errors. Focus ONLY on:
1. Task alignment (did student address the right type of letter correctly?)
2. Tone consistency (is the register maintained throughout?)
3. Authenticity check (memorized phrases, over-generalizations, non-native patterns)

For IELTS Task 1 {letter_type} letters, strong performance has:
- Correct interpretation of the letter's purpose (complaint/request/invitation/apology/etc.)
- Consistent register appropriate to the letter type throughout
- All required elements of the letter type included
- Authentic, non-templated expression appropriate to the context"""

        user_prompt = f"""
LETTER PROMPT: {letter_prompt}
LETTER TYPE: {letter_type}

USER LETTER:
{user_answer}

Conduct a deep analytical and authenticity assessment:

═══════════════════════════════════════════════════════════════════════════
4. TASK ALIGNMENT CHECK
═══════════════════════════════════════════════════════════════════════════

**Letter Type Analysis:**
What type of letter is required?
- Formal complaint
- Formal request / application
- Formal apology
- Semi-formal request / invitation
- Informal letter to friend
- Other (specify)

**Student's Interpretation:**
Did the student correctly understand the letter type and purpose?

**Required Elements Checklist:**
For COMPLAINT letters:
  - Problem clearly described? (Complete / Incomplete / Missing)
  - Impact/inconvenience stated? (Complete / Incomplete / Missing)
  - Resolution/action requested? (Complete / Incomplete / Missing)

For REQUEST letters:
  - Request clearly stated? (Complete / Incomplete / Missing)
  - Reason/context provided? (Complete / Incomplete / Missing)
  - Polite register maintained? (Yes / Partial / No)

For INFORMAL letters:
  - Appropriate salutation used? (Yes / No)
  - Personal/friendly tone throughout? (Yes / Partial / No)
  - All bullet points addressed? (Complete / Incomplete / Missing)

**Bullet Point Coverage:**
For each bullet point, was it:
  - Fully addressed (3+ sentences with context and detail)
  - Partially addressed (1-2 sentences, lacking depth)
  - Missing (not addressed at all)

**Coverage Balance:**
Estimate word allocation across bullet points (should be roughly equal):
Expected: Each bullet ~40-50 words
Actual: Bullet 1 ___w + Bullet 2 ___w + Bullet 3 ___w

**Misinterpretation Warning:**
If task was misunderstood, explain the error clearly

═══════════════════════════════════════════════════════════════════════════
5. TONE CONSISTENCY ANALYSIS
═══════════════════════════════════════════════════════════════════════════

**Overall Consistency Score:** 0-100%
**Rating:** Fully consistent / Mostly consistent / Inconsistent

**Per-Section Tone Scores:**
Rate each section for formality appropriateness (0-100%):
100% = Perfect register for letter type throughout section
50-99% = Mostly appropriate with minor lapses
0-49% = Significant register errors

**Register Violations:**
Identify specific instances where register is wrong:
- In formal: contractions, slang, overly casual phrases
- In informal: overly stiff, archaic, or formal phrasing

**Tone Shift Detection:**
Are there sections where tone suddenly changes? Flag these.

**Salutation-Closing Register Consistency:**
Does the formality of the salutation match the body and the closing?

═══════════════════════════════════════════════════════════════════════════
6. AUTHENTICITY & LETTER CONVENTION CHECK
═══════════════════════════════════════════════════════════════════════════

For each category below, you MUST follow this two-step process:
  STEP 1 — Find it: Locate the EXACT phrase in the letter and quote it verbatim.
  STEP 2 — Fix it: Write a concrete replacement (never leave the fix field empty).
  SKIP any item where you cannot complete BOTH steps.

**Memorized IELTS Letter Phrases** (max 5):
Common examples: "I am writing to bring to your attention", "I hope this letter finds you well",
"I look forward to your prompt response", "I trust you will understand my situation",
"Please do not hesitate to contact me"
  STEP 1 → "phrase": copy the exact words from the letter
  STEP 2 → "suggestion": write a specific, authentic replacement matching THIS letter's scenario
  If you can only do one step, OMIT the item.

**Over-generalizations**:
Absolute statements or excessive claims without qualification
("Everyone knows", "All companies must", "It is always the case")
  STEP 1 → "phrase": copy the exact words from the letter
  STEP 2 → "suggestion": write a SHORT replacement PHRASE only (3-8 words max)
  If you can only do one step, OMIT the item.

**Non-Native Letter Patterns**:
Non-English patterns in letter conventions (wrong prepositions in fixed phrases,
incorrect formal letter structures, direct translation patterns)
  STEP 1 → "phrase": copy the EXACT problematic phrase as the student WROTE it
  STEP 2 → "suggestion": write the corrected native-English version
  If you can only do one step, OMIT the item.

**Inappropriate Register Phrases**:
Phrases too formal for informal, or too informal for formal letters
  STEP 1 → "phrase": copy the exact phrase from the letter
  STEP 2 → "suggestion": write an appropriate register alternative
  If you can only do one step, OMIT the item.

**Formulaic vs Natural Ratio:**
Estimate % of letter that sounds templated vs authentic (0-100%). Target for Band 8+: 80%+ natural.

═══════════════════════════════════════════════════════════════════════════

PRE-OUTPUT VALIDATION — before returning JSON, check every item:
  ✓ memorized_phrases:        "phrase" non-empty AND "suggestion" non-empty
  ✓ over_generalizations:     "phrase" non-empty AND "suggestion" non-empty
  ✓ non_native_patterns:      "phrase" non-empty AND "suggestion" non-empty
  ✓ register_violations:      "phrase" non-empty AND "suggestion" non-empty
  Remove any item that fails either check.

Return ONLY valid JSON matching this exact structure:

{{
  "task_alignment": {{
    "letter_type_identified": "Formal complaint",
    "letter_type_student_treated_as": "Formal request",
    "correctly_interpreted": false,
    "required_elements": [
      {{
        "element": "Describe the problem with the product",
        "status": "Complete",
        "coverage_words": 55,
        "note": "Well-described with specific details about the damage"
      }}
    ],
    "coverage_balance": {{
      "expected_per_bullet": "40-50 words",
      "actual": {{"bullet_1": 55, "bullet_2": 20, "bullet_3": 45}},
      "balance_note": "Bullet 2 is underdeveloped compared to others"
    }},
    "misinterpretation_warning": null,
    "task_type_guide": "For complaint letters: Para 1 state purpose, Para 2 describe problem, Para 3 explain impact, Para 4 request resolution"
  }},
  "tone_consistency": {{
    "overall_score": 72,
    "consistency_rating": "Mostly consistent with notable lapses",
    "section_scores": [
      {{
        "section": "Opening",
        "formality_percentage": 95,
        "note": "Correct formal register established",
        "issues": []
      }},
      {{
        "section": "Body Paragraph 2",
        "formality_percentage": 55,
        "note": "Register drops significantly with informal expressions",
        "issues": ["I was like really annoyed", "the thing was totally broken"]
      }}
    ],
    "register_violations": [
      {{
        "location": "Body Paragraph 2, Sentence 3",
        "phrase": "the thing was totally broken",
        "issue": "Informal vocabulary in formal complaint",
        "formal_alternative": "the item was completely defective"
      }}
    ],
    "tone_shift_warning": "Body Paragraph 2 shows a marked departure from the formal register established in the opening.",
    "salutation_closing_consistency": "Consistent — both opening and closing maintain formal register"
  }},
  "authenticity": {{
    "memorized_phrases": [
      {{
        "phrase": "I hope this letter finds you well",
        "location": "Opening, Sentence 1",
        "issue": "Generic IELTS letter template opener irrelevant to a complaint letter",
        "suggestion": "I am writing regarding a serious issue with a product I purchased from your store on 15 January 2024"
      }}
    ],
    "over_generalizations": [
      {{
        "phrase": "All companies must provide quality products",
        "location": "Body Paragraph 1, Sentence 2",
        "issue": "Overly broad claim not specific to this situation",
        "suggestion": "reputable retailers are expected to uphold"
      }}
    ],
    "non_native_patterns": [
      {{
        "pattern": "Wrong preposition in letter fixed phrase",
        "location": "Closing, Sentence 1",
        "phrase": "I look forward for hearing from you",
        "suggestion": "I look forward to hearing from you",
        "explanation": "'Look forward to' always takes 'to', not 'for' — this is a fixed preposition"
      }}
    ],
    "register_violations": [
      {{
        "phrase": "I was really angry",
        "location": "Body Paragraph 2, Sentence 2",
        "issue": "Informal expression in formal complaint letter",
        "suggestion": "I was deeply disappointed and inconvenienced by this experience"
      }}
    ],
    "formulaic_vs_natural_percentage": 40,
    "authenticity_score": 60,
    "authenticity_note": "40% of letter uses memorised IELTS letter templates. For Band 8+, aim for 80%+ natural, context-specific expression."
  }},
  "overall_summary": "The letter demonstrates developing task achievement with a clear structure but inconsistent register. The opening correctly identifies the purpose but uses memorised phrasing. Bullet point development is uneven, with Bullet 2 significantly underdeveloped compared to the others. The salutation-closing pairing is incorrect, which will impact the score. Strengthening bullet development with specific context and correcting the sign-off would significantly improve the band."
}}

REMEMBER: Return ONLY the JSON object, nothing else.
"""
        raw = await self._call_ai(
            system_prompt, user_prompt,
            task_name="LetterStructureAnalytical",
            model=LETTER_STRUCTURE_MODEL,
            json_mode=True,
        )
        result = self._clean_json(raw)
        logger.info(f"  → Letter structure analytical complete: "
                    f"task correctly interpreted: {result.get('task_alignment', {}).get('correctly_interpreted', 'N/A')}, "
                    f"tone score: {result.get('tone_consistency', {}).get('overall_score', 'N/A')}, "
                    f"authenticity score: {result.get('authenticity', {}).get('authenticity_score', 'N/A')}")
        return result

    # ============================================================================
    # FLOW & LOGIC ANALYSIS (letter-tuned version of Task 2 flow analysis)
    # ============================================================================

    async def _analyze_flow_macro(
        self, user_answer: str, letter_prompt: str, letter_type: str = "formal"
    ) -> dict:
        """
        Parallel split 1/3 of flow & logic analysis for letters.
        Covers: paragraph_flow_analysis, logical_fallacies, cohesion_quality,
                paragraph_unity, overall_flow_score, flow_summary.
        """
        system_prompt = f"""You are an IELTS Task 1 Letter coherence expert analyzing letter flow and logical connections.

Your task: Assess logical progression and structural coherence at the paragraph level in this {letter_type} letter.

CRITICAL: You are NOT detecting individual grammar/vocabulary errors. Focus ONLY on:
1. Paragraph-to-paragraph flow strength (transition quality between letter sections)
2. Logical coherence (reasoning gaps, unsupported claims in the letter context)
3. Cohesion patterns (pronoun clarity, device variety, topic sentence effectiveness for each bullet)
4. Paragraph unity (single bullet focus maintenance per paragraph)

Strong letter coherence features:
- Smooth transitions between letter sections and bullet paragraphs
- Consistent register appropriate to the letter type throughout
- Clear pronoun references (especially 'it', 'they', 'this' in context of products/services/people)
- Varied cohesive devices appropriate to the letter's register
- Strong topic sentences that signal which bullet point each paragraph addresses
- Each paragraph unified around one bullet point only

Weak letter coherence features:
- Abrupt shifts between paragraphs without logical connection
- Tone/register inconsistency between sections
- Ambiguous pronouns (e.g., 'they' referring to both the shop and the manufacturer)
- Overuse of formal linkers in an informal letter (or vice versa)
- Vague paragraph openers not signalling which bullet is addressed
- Multiple bullet points crammed into one paragraph"""

        user_prompt = f"""
LETTER PROMPT: {letter_prompt}
LETTER TYPE: {letter_type}

USER LETTER:
{user_answer}

Conduct a macro-level flow and logic analysis of this letter:

═══════════════════════════════════════════════════════════════════════════
1. PARAGRAPH-TO-PARAGRAPH FLOW ANALYSIS
═══════════════════════════════════════════════════════════════════════════

For EACH transition (Opening→Body Para 1, Body Para 1→Body Para 2, Body Para 2→Body Para 3, Body Para 3→Closing):

**Flow Strength:** 0-100%
0-30%: Abrupt, jarring shift (no logical connection between sections)
30-60%: Weak connection (some link but not clearly signalled)
60-80%: Adequate transition (reader can follow but connection is mechanical)
80-100%: Smooth, natural flow (transition feels purposeful and appropriate to register)

**Quality:** Smooth / Adequate / Weak / Abrupt

**Reason:** WHY is it smooth or abrupt? What makes the connection work or fail?

**Logical Gap (if present):** What missing link would improve the connection?

**Transition Device Present:** Yes/No — is there a connector appropriate to the letter type?

**Suggestion:** If weak, provide a specific improvement for this letter's context

═══════════════════════════════════════════════════════════════════════════
2. LOGICAL COHERENCE & GAPS
═══════════════════════════════════════════════════════════════════════════

Identify any logical gaps or coherence issues specific to letter writing:

**Common Letter Logic Issues:**
- Missing chronological context (problem described without when/where/purchase date)
- Unsupported demands (requesting refund without explaining reason)
- Unexplained consequences (saying 'very inconvenient' without explaining how)
- Non-sequitur requests (asking for something unrelated to the stated problem)
- Missing causal chain (X happened → impact → therefore I request Y)

For each issue found:
- Type, location, exact problematic text, explanation, impact, suggested revision

═══════════════════════════════════════════════════════════════════════════
3. COHESION QUALITY MATRIX
═══════════════════════════════════════════════════════════════════════════

**A. Pronoun Reference Clarity:**
For pronouns like "it", "this", "that", "they", "them", "he", "she":
- Location, clarity (Clear / Ambiguous), referent or possible referents, suggested fix

**B. Cohesive Device Analysis:**
- Overall variety score (0-100%)
- Devices used (list)
- Devices overused (if any used 3+ times)
- Device categories underused (appropriate to letter type)
- Register-appropriateness of devices (e.g., 'Moreover' in informal letter = issue)

**C. Topic Sentence Effectiveness:**
For each body paragraph:
- The topic sentence text
- Effectiveness rating (1-5 stars): does it clearly signal which bullet it addresses?
- Suggestion for improvement (if needed)

═══════════════════════════════════════════════════════════════════════════
4. PARAGRAPH UNITY ANALYSIS
═══════════════════════════════════════════════════════════════════════════

For each body paragraph:
- Unity score (0-100%): Does it stay focused on ONE bullet point?
- Which bullet point is this paragraph meant to address?
- Off-topic drift detected? (Yes/No)
- Drift details (which sentence strays or mixes bullet points)
- Recommendation for improvement

═══════════════════════════════════════════════════════════════════════════

Return ONLY valid JSON matching this exact structure:

{{
  "paragraph_flow_analysis": [
    {{
      "from": "Opening paragraph",
      "to": "Body Paragraph 1",
      "flow_strength": 85,
      "quality": "Smooth",
      "reason": "Clear transition from purpose statement into first bullet point description",
      "transition_device_present": true,
      "transition_text": "Firstly",
      "logical_gap": null,
      "suggestion": null
    }}
  ],
  "logical_gaps": [
    {{
      "type": "Missing chronological context",
      "location": "Body Paragraph 1, Sentence 1",
      "problematic_text": "The product I bought was broken",
      "explanation": "No purchase date, store name, or product name provided — reader cannot understand the situation",
      "impact": "Weakens complaint by lacking essential context",
      "suggested_revision": "The [product name] I purchased from your [store name] on [date] was found to be defective upon opening."
    }}
  ],
  "cohesion_quality": {{
    "pronoun_reference_analysis": [
      {{
        "pronoun": "they",
        "location": "Body Paragraph 2, Sentence 2",
        "context": "I contacted them but they said it would be fixed.",
        "clarity": "Ambiguous",
        "possible_referents": ["the shop staff", "the manufacturer", "customer service"],
        "issue": "Reader cannot determine who 'they' refers to in this context",
        "suggested_fix": "the customer service team said the issue would be resolved",
        "severity": "Medium"
      }}
    ],
    "cohesive_device_variety": 55,
    "variety_rating": "Limited — overuse of additive connectors",
    "devices_used": ["Furthermore", "Moreover", "Also", "In addition"],
    "devices_overused": [
      {{
        "device": "Furthermore",
        "count": 3,
        "issue": "Used to start 3 consecutive sentences — becomes mechanical and inappropriate for semi-formal register",
        "suggestion": "Vary with: 'In addition', 'Additionally', 'I would also like to mention'"
      }}
    ],
    "devices_underused": ["Contrast markers (however, although, despite)", "Causal markers (as a result, consequently, therefore)"],
    "register_appropriateness_note": "All cohesive devices are appropriately formal for this letter type.",
    "variety_improvement_tip": "Include some contrast or causal connectors to show reasoning: 'As a result of this defect...' or 'Despite contacting customer service...'",
    "topic_sentences": [
      {{
        "paragraph": "Body Paragraph 1",
        "paragraph_number": 2,
        "sentence": "There was a problem with the item.",
        "effectiveness_rating": 2,
        "effectiveness_note": "Vague — does not signal which bullet point is being addressed or what the specific problem is",
        "strengths": [],
        "weaknesses": ["Too vague", "Does not forecast paragraph content"],
        "suggestion": "Replace with: 'I am writing to describe the fault I discovered with the [product name] upon delivery.'"
      }}
    ]
  }},
  "paragraph_unity": [
    {{
      "paragraph": "Body Paragraph 2",
      "paragraph_number": 3,
      "unity_score": 60,
      "unity_rating": "Moderate — two bullet points mixed",
      "bullet_addressed": "Bullet 2 (explain what you have done about it)",
      "drift_detected": true,
      "drift_details": "Sentence 3 starts discussing the desired resolution (Bullet 3) before the second bullet is fully developed",
      "drift_sentence": "Sentence 3: 'I would like a full refund as soon as possible.'",
      "recommendation": "Move the refund request to a separate paragraph dedicated to Bullet 3. Keep this paragraph focused on actions taken."
    }}
  ],
  "overall_flow_score": 65,
  "flow_summary": "The letter has adequate overall structure but shows weak paragraph-to-paragraph transitions and inconsistent paragraph unity, with two bullet points merged in Body Paragraph 2. Pronoun ambiguity ('they') in the middle section reduces clarity. Strengthening topic sentences and separating bullet content into dedicated paragraphs would significantly improve flow."
}}

REMEMBER: Return ONLY the JSON object, nothing else.
"""
        raw = await self._call_ai(
            system_prompt, user_prompt,
            task_name="FlowMacro-Letter",
            model=FLOW_LOGIC_MODEL,
            json_mode=True,
        )
        result = self._clean_json(raw)
        logger.info(f"  → Flow macro complete: "
                    f"{len(result.get('paragraph_flow_analysis', []))} paragraph transitions, "
                    f"overall flow score {result.get('overall_flow_score', 'N/A')}")
        return result

    async def _analyze_flow_sentence(
        self, user_answer: str, letter_prompt: str, letter_type: str = "formal"
    ) -> dict:
        """
        Parallel split 2/3 of flow analysis for letters.
        Covers: sentence_flow_analysis ONLY — internal sentence-to-sentence transitions.
        Smooth transitions output compact form; only Weak/Abrupt get full detail.
        """
        system_prompt = f"""You are an IELTS Task 1 Letter coherence expert analyzing sentence-level flow within letter paragraphs.

Your task: Assess internal sentence-to-sentence transitions in each body paragraph of this {letter_type} letter.

OUTPUT EFFICIENCY RULE (strictly follow to keep response concise):
- For transitions with quality "Smooth" (flow_strength >= 70): output ONLY flow_strength and quality.
- For transitions with quality "Adequate", "Weak", or "Abrupt" (flow_strength < 70): output the full object including reason, cohesive_link_present, cohesive_link, and suggestion.
This rule is mandatory. Do not add extra fields to smooth transitions.

LETTER-SPECIFIC CONTEXT:
In letters, sentence flow within a bullet-point paragraph should follow:
Situation/context → Specific details → Impact/consequence → Action taken or desired
Check that each sentence builds on the previous one in this logical chain."""

        user_prompt = f"""
LETTER PROMPT: {letter_prompt}
LETTER TYPE: {letter_type}

USER LETTER:
{user_answer}

For EACH body paragraph, analyze the internal flow between consecutive sentences.

Rules:
- Smooth transition (flow_strength >= 70): ONLY include "from_sentence", "to_sentence", "flow_strength", "quality"
- Weak/Abrupt transition (flow_strength < 70): include ALL fields including "reason", "cohesive_link_present", "cohesive_link", "suggestion"

Return ONLY valid JSON:

{{
  "sentence_flow_analysis": [
    {{
      "paragraph": "Body Paragraph 1",
      "paragraph_number": 2,
      "overall_internal_flow": 65,
      "sentence_transitions": [
        {{
          "from_sentence": "S1",
          "to_sentence": "S2",
          "flow_strength": 85,
          "quality": "Smooth"
        }},
        {{
          "from_sentence": "S2",
          "to_sentence": "S3",
          "flow_strength": 45,
          "quality": "Weak",
          "reason": "Abrupt jump from describing the problem to requesting a refund without explaining the impact or prior contact attempts",
          "cohesive_link_present": false,
          "cohesive_link": null,
          "suggestion": "Add a bridging sentence explaining impact: 'As a result of this defect, I was unable to use the item as planned, causing significant inconvenience.'"
        }}
      ],
      "internal_flow_summary": "Generally adequate opening but weak S2→S3 transition skips the causal chain from problem to resolution request"
    }}
  ]
}}

REMEMBER: Return ONLY the JSON object, nothing else.
"""
        raw = await self._call_ai(
            system_prompt, user_prompt,
            task_name="FlowSentence-Letter",
            model=FLOW_LOGIC_MODEL,
            json_mode=True,
        )
        result = self._clean_json(raw)
        logger.info(f"  → Flow sentence complete: "
                    f"{len(result.get('sentence_flow_analysis', []))} paragraphs analyzed for internal flow")
        return result

    async def _analyze_flow_register(
        self, user_answer: str, letter_prompt: str, letter_type: str = "formal"
    ) -> dict:
        """
        Parallel split 3/3 of flow analysis for letters.
        Covers: register_consistency ONLY — appropriate to the letter type.
        """
        system_prompt = f"""You are an IELTS Task 1 Letter register and tone expert.

Your task: Assess register consistency throughout this {letter_type} letter.

Focus ONLY on:
- Per-section formality scores (is the register appropriate for the {letter_type} letter type?)
- Register violations (informal in formal, or overly formal in informal)
- Tone shift detection

REGISTER RULES FOR {letter_type.upper()} LETTERS:
{
    "FORMAL: No contractions, no slang, polite vocabulary, passive voice acceptable, 'I am writing to...' style openings, 'Yours sincerely/faithfully' closing" if letter_type == "formal"
    else "SEMI-FORMAL: Some contractions acceptable, friendly but professional, 'Dear [first name]', 'Kind regards' closing" if letter_type.lower() in ("semi-formal", "semiformal")
    else "INFORMAL: Contractions welcome, casual vocabulary fine, 'Hi/Dear [first name]', 'Best wishes' closing, personal anecdotes fine"
}

CRITICAL RULE for register_violations: Every item MUST have BOTH:
  "phrase" → the EXACT problematic word/phrase from the letter (verbatim)
  "appropriate_alternative" → a concrete register-appropriate replacement
Omit any item where you cannot provide both fields."""

        user_prompt = f"""
LETTER PROMPT: {letter_prompt}
LETTER TYPE: {letter_type}

USER LETTER:
{user_answer}

Assess register and tone consistency for this {letter_type} letter:

**Per-Section Formality Scores:**
Rate each section 0-100% for register appropriateness.
100% = Perfect register for this {letter_type} letter type
50-99% = Mostly appropriate with minor lapses
0-49% = Significant register errors

BREVITY RULE: "note" field: max 10 words per section.

**Register Violations:**
For each violation provide BOTH:
- "phrase": EXACT word/phrase from the letter (verbatim — never empty)
- "appropriate_alternative": concrete register-appropriate replacement (never empty)
Skip any item where you cannot provide both fields.
BREVITY RULE: "issue" field: max 10 words.

**Tone Shift Detection:**
One sentence max flagging any section where register shifts unexpectedly.

Return ONLY valid JSON:

{{
  "register_consistency": {{
    "overall_score": 78,
    "consistency_rating": "Mostly consistent with two informal lapses in body",
    "section_scores": [
      {{
        "section": "Opening",
        "formality_percentage": 95,
        "note": "Correct formal register established",
        "issues": []
      }},
      {{
        "section": "Body Paragraph 2",
        "formality_percentage": 50,
        "note": "Two informal expressions detected",
        "issues": ["I was like really angry", "the thing broke"]
      }}
    ],
    "register_violations": [
      {{
        "location": "Body Paragraph 2, Sentence 3",
        "phrase": "I was like really angry",
        "issue": "Highly informal expression in formal complaint",
        "appropriate_alternative": "I was extremely disappointed and inconvenienced"
      }}
    ],
    "tone_shift_warning": "Body Paragraph 2 drops to 50% appropriateness — maintain formal register throughout.",
    "register_advice": "In formal letters, avoid contractions, slang, and emotional informal expressions. Use: 'I was deeply concerned', 'I find this situation unacceptable', 'I would be grateful if you could'."
  }}
}}

REMEMBER: Return ONLY the JSON object, nothing else.
"""
        raw = await self._call_ai(
            system_prompt, user_prompt,
            task_name="FlowRegister-Letter",
            model=FLOW_LOGIC_MODEL,
            max_tokens=400,
            json_mode=True,
        )
        result = self._clean_json(raw)
        logger.info(f"  → Flow register complete: "
                    f"register score {result.get('register_consistency', {}).get('overall_score', 'N/A')}")
        return result

    # ------------------------------------------------------------------
    # DATA CLEANERS
    # ------------------------------------------------------------------

    def _clean_letter_structure_data(self, structure_data: dict) -> dict:
        """
        Remove authenticity sub-items where either the source phrase OR the
        suggested fix is absent. This prevents empty bullet points in the UI.
        """
        import copy
        data = copy.deepcopy(structure_data)
        auth = data.get("authenticity", {})
        if not isinstance(auth, dict):
            return data

        def _both_nonempty(item: dict, key1: str, key2: str) -> bool:
            return bool((item.get(key1) or "").strip()) and bool((item.get(key2) or "").strip())

        auth["memorized_phrases"] = [
            i for i in (auth.get("memorized_phrases") or [])
            if _both_nonempty(i, "phrase", "suggestion")
        ]
        auth["over_generalizations"] = [
            i for i in (auth.get("over_generalizations") or [])
            if _both_nonempty(i, "phrase", "suggestion")
        ]
        auth["non_native_patterns"] = [
            i for i in (auth.get("non_native_patterns") or [])
            if _both_nonempty(i, "phrase", "suggestion")
        ]
        auth["register_violations"] = [
            i for i in (auth.get("register_violations") or [])
            if _both_nonempty(i, "phrase", "suggestion")
        ]

        data["authenticity"] = auth

        tc = data.get("tone_consistency", {})
        if isinstance(tc, dict):
            rv = tc.get("register_violations", [])
            if isinstance(rv, list):
                tc["register_violations"] = [
                    i for i in rv
                    if _both_nonempty(i, "phrase", "formal_alternative")
                ]
        data["tone_consistency"] = tc

        return data

    def _clean_flow_data(self, flow_data: dict) -> dict:
        """
        Post-process flow_logic_analysis to filter out any entries missing
        required display fields.
        """
        import copy
        data = copy.deepcopy(flow_data)

        def _has_both(item: dict, key1: str, key2: str) -> bool:
            v1 = (item.get(key1) or "").strip()
            v2 = (item.get(key2) or "").strip()
            return bool(v1) and bool(v2)

        reg = data.get("register_consistency", {})
        if isinstance(reg, dict):
            hotspots = reg.get("register_violations", [])
            if isinstance(hotspots, list):
                reg["register_violations"] = [
                    h for h in hotspots
                    if _has_both(h, "phrase", "appropriate_alternative")
                ]

        gaps = data.get("logical_gaps", [])
        if isinstance(gaps, list):
            data["logical_gaps"] = [
                f for f in gaps
                if _has_both(f, "problematic_text", "suggested_revision")
            ]

        cohesion = data.get("cohesion_quality", {})
        if isinstance(cohesion, dict):
            pronouns = cohesion.get("pronoun_reference_analysis", [])
            if isinstance(pronouns, list):
                cohesion["pronoun_reference_analysis"] = [
                    p for p in pronouns
                    if _has_both(p, "pronoun", "suggested_fix")
                ]
            overused = cohesion.get("devices_overused", [])
            if isinstance(overused, list):
                cohesion["devices_overused"] = [
                    d for d in overused
                    if _has_both(d, "device", "suggestion")
                ]

        return data

    # ------------------------------------------------------------------
    # GRAMMAR ANALYSIS
    # ------------------------------------------------------------------

    async def _generate_grammar_analysis(
        self, error_data: dict, letter_prompt: str, user_answer: str,
        pre_fetched_ai_result: Optional[str] = None
    ) -> dict:
        """Generate grammar analysis for LETTER-SPECIFIC structures (merged local heuristics + AI)."""
        grammar_errors = [
            e for e in error_data.get("errors", [])
            if e.get("official_criteria") == "Grammatical Range & Accuracy"
        ]
        errors_by_subcat: Dict[str, List[dict]] = defaultdict(list)
        for err in grammar_errors:
            errors_by_subcat[err.get("sub_category", "Other")].append(err)

        # Heuristic local analysis
        used_structures: List[str] = []
        if not grammar_errors:
            used_structures = [
                "Wide range of grammatical structures appropriate to letter writing",
                "Correct use of indirect questions for polite requests",
                "Accurate tense usage (past for problems, present for current situation)",
                "Appropriate modal verbs for politeness (would, could)",
                "Consistent subject-verb agreement",
                "Perfect letter punctuation including salutation and closing",
            ]
        else:
            if any(e.get("error_id") in ("tense_aspect", "tense_consistency") for e in grammar_errors):
                used_structures.append("Various tense forms (past for describing problems, present for current status)")
            if any(e.get("error_id") == "subject_verb_agreement" for e in grammar_errors):
                used_structures.append("Subject-verb agreement in simple sentences")
            if "Complexity" not in errors_by_subcat:
                used_structures.append("Complex sentences with subordinators (because, although, while)")
                used_structures.append("Conditional structures for polite requests")
            if not used_structures:
                used_structures = ["Basic sentence structures present"]

        enrichments: List[dict] = []

        if "Accuracy" in errors_by_subcat:
            acc_errors  = errors_by_subcat["Accuracy"]
            error_types = {e.get("error_id") for e in acc_errors}
            if "word_order" in error_types or any("indirect" in e.get("error_label", "").lower() for e in acc_errors):
                enrichments.append({
                    "structure": "Indirect Questions (e.g., 'Could you tell me where the office is?')",
                    "benefit":   "Essential for polite letter requests; demonstrates grammatical range. CRITICAL for Band 7+.",
                    "example_context": "I would be grateful if you could let me know when the replacement item will be dispatched."
                })
            if "article_determiner" in error_types:
                enrichments.append({
                    "structure": "Correct Article Usage (a, an, the, zero article) in letter context",
                    "benefit":   "Shows fine control over noun referencing expected at high bands.",
                    "example_context": "I received THE letter yesterday (specific reference). I need A replacement (first mention)."
                })

        if "Punctuation" in errors_by_subcat:
            enrichments.append({
                "structure": "Letter-Specific Punctuation (comma after informal salutations, after transitions, capitals for sign-off)",
                "benefit":   "Improves readability and demonstrates mastery of letter conventions.",
                "example_context": "'Dear John,' (comma). 'However, I would like to...' (comma). 'Yours sincerely,' (capital Y)."
            })

        # Band 8+ letter structures — always include exactly 3 total
        advanced_always = [
            {
                "structure": "Indirect Questions for Polite Requests (e.g., 'I would be grateful if you could tell me whether...')",
                "benefit":   "Essential for formal letter requests; demonstrates range and appropriate politeness. CRITICAL for Band 7+.",
                "example_context": "I would appreciate it if you could confirm when the refund will be processed."
            },
            {
                "structure": "Conditional Type 2 for Polite Formal Requests (e.g., 'I would be grateful if you could...')",
                "benefit":   "Creates appropriately polite and formal tone; essential for Band 7+ formal letters.",
                "example_context": "I would be grateful if you could arrange for a full refund at your earliest convenience."
            },
            {
                "structure": "Nominalisation in Letter Context (turning verbs into nouns: 'complain' → 'complaint', 'replace' → 'replacement')",
                "benefit":   "Creates formal register and allows more sophisticated expression in complaint/request letters.",
                "example_context": "I trust that a satisfactory resolution to this matter will be forthcoming."
            },
        ]
        existing_keys = {e["structure"] for e in enrichments}
        for adv in advanced_always:
            if len(enrichments) >= 3:
                break
            if adv["structure"] not in existing_keys:
                enrichments.append(adv)

        total = len(grammar_errors)
        if total == 0:
            summary = "Excellent grammatical control with no errors detected. Continue using a wide range of structures while maintaining full accuracy in your letters."
        elif total <= 3:
            summary = f"Good grammatical control with {total} error(s). Primary focus areas: {', '.join(errors_by_subcat.keys())}."
        else:
            summary = f"{total} grammatical errors identified. Key areas requiring review: {', '.join(errors_by_subcat.keys())}."

        tips: List[str] = []
        if "Accuracy" in errors_by_subcat:
            tips.append("✅ CRITICAL: Master indirect question word order for letter requests: 'Could you tell me WHERE IT IS' (not 'where is it').")
            tips.append("Practise polite request structures: 'I would be grateful if...', 'Could you possibly...', 'I would appreciate it if...'")
        if "Punctuation" in errors_by_subcat:
            tips.append("Review letter-specific punctuation: comma after informal salutations, after transitions, capitals for sign-off phrases.")
        if not tips:
            tips = [
                "Vary sentence openings in your letter — avoid starting every sentence with 'I'.",
                "Use a mix of simple, compound, and complex sentences to demonstrate grammatical range.",
                "Include advanced structures natural to letters: passives, conditionals, indirect questions.",
            ]

        local_result = {
            "grammar_analysis": {
                "used_structures":               used_structures,
                "suggested_enrichments":         enrichments[:3],
                "strengths_weaknesses_summary":  summary,
                "expert_tips":                   tips,
            }
        }

        if pre_fetched_ai_result is not None:
            raw_ai = pre_fetched_ai_result
            logger.info("  → Grammar: using pre-fetched AI result (no extra API call).")
        else:
            grammar_system = (
                "You are an expert IELTS Grammar Specialist focusing on Grammatical Range and Accuracy in Task 1 General Training letters. "
                "Respond only with a valid JSON object."
            )
            grammar_user = f"""
LETTER PROMPT: {letter_prompt}
USER LETTER: {user_answer}

TASK: Analyse the grammar in this letter deeply and provide a structured report focused on LETTER-SPECIFIC grammar.

**1. DETECTED STRUCTURES**
List the grammatical structures the student ACTUALLY used in the letter. Be specific to letter writing.

**2. SUGGESTED ENRICHMENTS — EXACTLY 3 ITEMS**
Identify exactly 3 specific grammar structures missing or underutilised that would reach Band 8+ in a Task 1 letter.
You MUST provide exactly 3 items — no more, no less.

CRITICAL INSTRUCTIONS FOR ENRICHMENTS:
- "structure": Include a simple example in parentheses for non-technical users.
  e.g. "Indirect Questions (e.g., 'Could you tell me where the office is?')"
- "benefit": Explain why it helps in letter writing specifically.
- "example_context": Provide a specific example using the ACTUAL content and scenario of this letter.

**3. STRENGTHS & WEAKNESSES**
Write a concise summary analysing the grammatical performance in the context of letter writing.

**4. CRITICAL EXPERT TIPS**
Provide specific, actionable tips to enhance grammatical quality in letters.

Return ONLY a valid JSON object:
{{
  "grammar_analysis": {{
    "used_structures": ["..."],
    "suggested_enrichments": [
      {{
        "structure": "...",
        "benefit": "...",
        "example_context": "..."
      }},
      {{
        "structure": "...",
        "benefit": "...",
        "example_context": "..."
      }},
      {{
        "structure": "...",
        "benefit": "...",
        "example_context": "..."
      }}
    ],
    "strengths_weaknesses_summary": "...",
    "expert_tips": ["..."]
  }}
}}

IMPORTANT: suggested_enrichments MUST contain EXACTLY 3 items."""

            try:
                raw_ai = await self._call_ai(
                    grammar_system, grammar_user,
                    task_name="Grammar",
                    model=GRAMMAR_MODEL,
                    json_mode=True,
                )
            except Exception as e:
                logger.warning(f"Grammar AI call failed: {e}. Using local analysis only.")
                raw_ai = None

        ai_result = self._clean_json(raw_ai) if raw_ai else None

        if isinstance(ai_result, dict) and "grammar_analysis" in ai_result:
            ai_ga = ai_result["grammar_analysis"]
            merged_used = ai_ga.get("used_structures") or local_result["grammar_analysis"]["used_structures"]

            # Cap AI enrichments at exactly 3
            ai_enrichments = (ai_ga.get("suggested_enrichments") or [])[:3]
            merged_map: Dict[str, dict] = {}
            for item in ai_enrichments:
                key = item.get("structure")
                if key:
                    merged_map[key] = item
            if len(merged_map) < 3:
                for item in local_result["grammar_analysis"]["suggested_enrichments"]:
                    if len(merged_map) >= 3:
                        break
                    key = item.get("structure")
                    if key and key not in merged_map:
                        merged_map[key] = item
            merged_enrichments = list(merged_map.values())[:3]

            merged_summary = ai_ga.get("strengths_weaknesses_summary") or local_result["grammar_analysis"]["strengths_weaknesses_summary"]
            merged_tips: List[str] = []
            for t in (ai_ga.get("expert_tips") or []) + local_result["grammar_analysis"]["expert_tips"]:
                if t not in merged_tips:
                    merged_tips.append(t)

            return {
                "grammar_analysis": {
                    "used_structures":              merged_used,
                    "suggested_enrichments":        merged_enrichments,
                    "strengths_weaknesses_summary": merged_summary,
                    "expert_tips":                  merged_tips,
                }
            }

        return local_result

    # ------------------------------------------------------------------
    # ERROR SUMMARY BUILDER
    # ------------------------------------------------------------------

    def _build_error_summary(self, all_errors: List[dict]) -> dict:
        """Build structured error summary."""
        error_summary = {
            "total_errors": len(all_errors),
            "by_criteria": {},
            "by_severity": {"major": 0, "high": 0, "medium": 0, "low": 0},
            "by_sub_category": {},
        }
        for error in all_errors:
            crit   = error.get("official_criteria", "Other")
            sev    = error.get("severity", "medium")
            subcat = error.get("sub_category", "Other")
            error_summary["by_criteria"][crit]      = error_summary["by_criteria"].get(crit, 0) + 1
            error_summary["by_severity"][sev]        = error_summary["by_severity"].get(sev, 0) + 1
            error_summary["by_sub_category"][subcat] = error_summary["by_sub_category"].get(subcat, 0) + 1
        return error_summary

    # ------------------------------------------------------------------
    # REPORT SAVING
    # ------------------------------------------------------------------

    def _save_comprehensive_report(
        self, result: dict, exam_name: str, letter_prompt: str, user_answer: str,
        letter_type: str = "formal", bullet_points: Optional[List[str]] = None,
        opening_line: str = ""
    ) -> Optional[str]:
        try:
            reports_dir = Path("asset/reports")
            reports_dir.mkdir(parents=True, exist_ok=True)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_id = f"report_{timestamp}"
            filename  = f"{report_id}.json"
            filepath  = reports_dir / filename

            report = {
                "metadata": {
                    "report_id":               report_id,
                    "timestamp":               datetime.now().isoformat(),
                    "exam_name":               exam_name,
                    "letter_prompt":           letter_prompt,
                    "letter_type":             letter_type,
                    "bullet_points":           bullet_points or [],
                    "opening_line":            opening_line,
                    "user_answer":             user_answer,
                    "grading_system_version":  "7.1-TASK1-LETTER-FULL-ARCH",
                    "scoring_models":          {"model_a": SCORING_MODEL_A, "model_b": SCORING_MODEL_B},
                    "error_detection_model":   ERROR_DETECTION_MODEL,
                },
                "scores": {
                    "overall_band":    result.get("overall_band", "N/A"),
                    "criteria_scores": result.get("criteria_scores", {}),
                    "breakdown":       result.get("breakdown", {}),
                    "scoring_details": result.get("scoring_details", {}),
                },
                "error_analysis": {
                    "all_errors":    result.get("all_errors", []),
                    "error_summary": result.get("error_summary", {}),
                },
                "dual_independent_assessment": {
                    "model_a": result.get("scoring_round_a", {}),
                    "model_b": result.get("scoring_round_b", {}),
                    "averaged": result.get("averaged_scoring", {}),
                },
                "revision":   result.get("revision_data", {}),
                "vocabulary": result.get("vocabulary", []),
                "grammar":    result.get("grammar", {}),
                "letter_structure_analysis": result.get("letter_structure_analysis", {}),
                "flow_logic_analysis":       result.get("flow_logic_analysis", {}),
            }

            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2, ensure_ascii=False)

            logger.info(f"Report saved: {filepath}")
            return str(filepath)

        except Exception as e:
            logger.error(f"Failed to save report: {str(e)}")
            return None

    # ------------------------------------------------------------------
    # MAIN GRADING ENTRY POINT (v7.1 - FULL ARCHITECTURE)
    # ------------------------------------------------------------------

    async def grade_letter(
        self,
        user_answer: str,
        letter_prompt: str,
        bullet_points: Optional[List[str]] = None,
        letter_type: str = "formal",
        opening_line: str = "",
        exam_name: str = "IELTS Writing Task 1 - General",
    ) -> dict:
        """
        v7.1 – FULL ARCHITECTURE TASK 1 LETTER GRADER

        Architecture mirrors Task 2 grader with letter-specific tuning:
          CHANGE 1: Vocabulary split into 3 parallel batches (10 items each = 30 total)
                    covering Letter Opening/Closing Phrases, Topic-Specific Letter Vocab,
                    Advanced Letter Structures & Cohesive Expressions.
          CHANGE 2: Letter Structure Analysis (2 parallel calls) replaces Argumentation:
                    Formal analysis (opening, bullet development, closing) +
                    Analytical analysis (task alignment, tone, authenticity).
          CHANGE 3: GrammarPrefetch requests EXACTLY 3 suggested enrichments.
                    Merge logic caps at 3 items.
          CHANGE 4: _clean_flow_data() and _clean_letter_structure_data() post-process
                    results, removing items missing required phrase/fix display fields.
          CHANGE 5: Simple averaging in _average_two_scoring_rounds — identical to Task 2.
                    Model B uses scores-only + overall_summary path (proper if/else split).

        Total parallel calls: 20 (identical architecture to Task 2 grader).
        """
        try:
            # Build enriched prompt context
            bp_text = ""
            if bullet_points:
                bp_text = "\nBullet Points to Address:\n" + "\n".join(
                    f"  • {bp}" for bp in bullet_points
                )
            full_letter_prompt = (
                f"Letter Type: {letter_type}\n"
                f"Opening Line: {opening_line}\n"
                f"Prompt: {letter_prompt}"
                f"{bp_text}"
            )

            logger.info("=" * 80)
            logger.info("IELTS GRADING v7.1 – TASK 1 LETTER – FULL ARCHITECTURE")
            logger.info(f"  Scoring models  : A={SCORING_MODEL_A}  B={SCORING_MODEL_B}")
            logger.info(f"  Error detection : {ERROR_DETECTION_MODEL} @ temp=dynamic(gpt4:{ERROR_DETECTION_TEMPERATURE_GPT4}/gpt5:1.0)")
            logger.info(f"  Grammar AI      : {GRAMMAR_MODEL} (prefetched, exactly 3 enrichments)")
            logger.info(f"  Letter structure: {LETTER_STRUCTURE_MODEL} (2 parallel calls)")
            logger.info(f"  Flow & Logic    : {FLOW_LOGIC_MODEL} (3 parallel calls)")
            logger.info("  Vocab           : 3 parallel batches (10 items each = 30 total)")
            logger.info(f"  Letter type     : {letter_type}")
            logger.info(f"  Bullet points   : {len(bullet_points) if bullet_points else 0}")
            logger.info("=" * 80)

            # Grammar prefetch prompt — exactly 3 enrichments
            grammar_system = (
                "You are an expert IELTS Grammar Specialist focusing on Grammatical Range and Accuracy in Task 1 General Training letters. "
                "Respond only with a valid JSON object."
            )
            grammar_user = f"""
LETTER PROMPT: {full_letter_prompt}
USER LETTER: {user_answer}

TASK: Analyse the grammar in this letter deeply and provide a structured report focused on LETTER-SPECIFIC grammar.

**1. DETECTED STRUCTURES**
List the grammatical structures the student ACTUALLY used in the letter. Be specific to letter writing.

**2. SUGGESTED ENRICHMENTS — EXACTLY 3 ITEMS**
Identify exactly 3 specific grammar structures missing or underutilised that would reach Band 8+ in a Task 1 letter.
You MUST provide exactly 3 items — no more, no less.

CRITICAL INSTRUCTIONS FOR ENRICHMENTS:
- "structure": Include a simple example in parentheses for non-technical users.
- "benefit": Explain why it helps in letter writing specifically.
- "example_context": Provide a specific example using the ACTUAL content and scenario of this letter.

**3. STRENGTHS & WEAKNESSES**
Write a concise summary analysing the grammatical performance in the context of letter writing.

**4. CRITICAL EXPERT TIPS**
Provide specific, actionable tips to enhance grammatical quality in letters.

Return ONLY a valid JSON object:
{{
  "grammar_analysis": {{
    "used_structures": ["..."],
    "suggested_enrichments": [
      {{"structure": "...", "benefit": "...", "example_context": "..."}},
      {{"structure": "...", "benefit": "...", "example_context": "..."}},
      {{"structure": "...", "benefit": "...", "example_context": "..."}}
    ],
    "strengths_weaknesses_summary": "...",
    "expert_tips": ["..."]
  }}
}}

IMPORTANT: suggested_enrichments MUST contain EXACTLY 3 items."""

            logger.info("\n[MEGA-BATCH] Launching 20 parallel API calls...")

            mega_batch_results = await asyncio.gather(
                # Error detection (4 calls) — indices 0-3
                self._detect_errors_for_criterion(user_answer, full_letter_prompt, "Task Achievement"),
                self._detect_errors_for_criterion(user_answer, full_letter_prompt, "Coherence & Cohesion"),
                self._detect_errors_for_criterion(user_answer, full_letter_prompt, "Lexical Resource"),
                self._detect_errors_for_criterion(user_answer, full_letter_prompt, "Grammatical Range & Accuracy"),
                # Scoring Model A — 4 single-criterion calls — indices 4-7
                self._perform_scoring_for_criteria_subset(user_answer, full_letter_prompt, ["Task Achievement"],              SCORING_MODEL_A),
                self._perform_scoring_for_criteria_subset(user_answer, full_letter_prompt, ["Coherence & Cohesion"],          SCORING_MODEL_A),
                self._perform_scoring_for_criteria_subset(user_answer, full_letter_prompt, ["Lexical Resource"],              SCORING_MODEL_A),
                self._perform_scoring_for_criteria_subset(user_answer, full_letter_prompt, ["Grammatical Range & Accuracy"], SCORING_MODEL_A),
                # Scoring Model B — index 8
                self._perform_detailed_independent_scoring(user_answer, full_letter_prompt, SCORING_MODEL_B),
                # Revision — index 9
                self._generate_revision(user_answer, full_letter_prompt, letter_type),
                # Grammar AI prefetch — index 10
                self._call_ai(grammar_system, grammar_user, task_name="GrammarPrefetch", model=GRAMMAR_MODEL, json_mode=True),
                # Letter Structure Analysis — 2 parallel calls — indices 11-12
                self._analyze_letter_structure_formal(user_answer, full_letter_prompt, letter_type),
                self._analyze_letter_structure_analytical(user_answer, full_letter_prompt, letter_type),
                # Flow & Logic — 3 parallel calls — indices 13-15
                self._analyze_flow_macro(user_answer, full_letter_prompt, letter_type),
                self._analyze_flow_sentence(user_answer, full_letter_prompt, letter_type),
                self._analyze_flow_register(user_answer, full_letter_prompt, letter_type),
                # Vocabulary — 3 parallel batches — indices 16-18
                self._generate_vocabulary_batch(user_answer, full_letter_prompt, 1, "Letter Opening & Closing Phrases",              ["Letter Opening Phrases", "Letter Closing Phrases"],               letter_type=letter_type),
                self._generate_vocabulary_batch(user_answer, full_letter_prompt, 2, "Topic-Specific Letter Vocabulary",              ["Topic-Specific Nouns & Verbs", "Formal Adjectives & Adverbs"],    letter_type=letter_type),
                self._generate_vocabulary_batch(user_answer, full_letter_prompt, 3, "Advanced Letter Structures & Cohesive Expressions", ["Advanced Letter Structures", "Cohesive Expressions for Letters"], letter_type=letter_type),
            )

            # Unpack results
            ta_errors       = mega_batch_results[0]
            cc_errors       = mega_batch_results[1]
            lr_errors       = mega_batch_results[2]
            gra_errors      = mega_batch_results[3]
            scoring_round_a = {
                **mega_batch_results[4],
                **mega_batch_results[5],
                **mega_batch_results[6],
                **mega_batch_results[7],
            }
            scoring_round_b        = mega_batch_results[8]
            revision_data          = mega_batch_results[9]
            grammar_ai_raw         = mega_batch_results[10]
            letter_structure_data  = self._clean_letter_structure_data({
                **mega_batch_results[11],
                **mega_batch_results[12],
            })
            flow_logic_raw  = {
                **mega_batch_results[13],
                **mega_batch_results[14],
                **mega_batch_results[15],
            }
            flow_logic_data = self._clean_flow_data(flow_logic_raw)

            # Merge vocabulary batches
            seen_words: set = set()
            merged_vocab: List[dict] = []
            for batch_items in [mega_batch_results[16], mega_batch_results[17], mega_batch_results[18]]:
                for item in (batch_items or []):
                    word_key = (item.get("word") or "").lower().strip()
                    if word_key and word_key not in seen_words:
                        seen_words.add(word_key)
                        merged_vocab.append(item)
            vocabulary_data = {"vocabulary_enhancements": merged_vocab}
            logger.info(f"  → Vocabulary merged: {len(merged_vocab)} unique items from 3 batches.")

            all_errors: List[dict] = ta_errors + cc_errors + lr_errors + gra_errors
            logger.info(f"  → MEGA-BATCH complete. Total errors: {len(all_errors)}")

            error_summary = self._build_error_summary(all_errors)
            error_data = {"errors": all_errors, "error_summary": error_summary}

            logger.info("  → Averaging dual scoring rounds...")
            averaged_scoring = self._average_two_scoring_rounds(scoring_round_a, scoring_round_b)
            final_scores     = self._build_final_scores_from_dual_rounds(averaged_scoring)
            summary = scoring_round_b.get("overall_summary", "")
            if not summary:
                logger.warning("Model B did not generate summary, building fallback from averaged scores.")
                _criteria_keys = [
                    "Task Response",
                    "Coherence & Cohesion",
                    "Lexical Resource",
                    "Grammatical Range & Accuracy",
                ]
                _parts: List[str] = []
                for _ck in _criteria_keys:
                    _cd = averaged_scoring.get(_ck, {})
                    _j  = (_cd.get("overall_justification") or "").strip()
                    _s  = _cd.get("overall_score", "")
                    if _j:
                        _parts.append(f"In {_ck}, {_j.lower()}")
                if _parts:
                    summary = " ".join(_parts)
                else:
                    summary = (
                        "This essay has been assessed across all four IELTS criteria. "
                        "Task Response reflects how completely and clearly the prompt was addressed. "
                        "Coherence and Cohesion captures the organisation and logical flow of ideas. "
                        "Lexical Resource reflects the range and precision of vocabulary used. "
                        "Grammatical Range and Accuracy reflects structural variety and correctness. "
                        "Please review each criterion section below for detailed observations and targeted advice."
                    )
            logger.info(f"  → Final overall band: {final_scores['overall_band']}")

            logger.info("\n[SEQUENTIAL] Grammar merge (CPU-only — AI was prefetched)...")
            grammar_data = await self._generate_grammar_analysis(
                error_data, full_letter_prompt, user_answer,
                pre_fetched_ai_result=grammar_ai_raw,
            )
            logger.info("  → Grammar complete.")

            logger.info("\n[CPU] Generating detailed feedback (no API call)...")
            feedback_result = await self._generate_detailed_feedback(
                user_answer, full_letter_prompt, error_data, final_scores, averaged_scoring
            )
            breakdown = feedback_result.get("breakdown", {})

            errors_by_criteria: Dict[str, List[dict]] = {}
            errors_by_sub_category: Dict[str, List[dict]] = defaultdict(list)
            errors_by_severity: Dict[str, List[dict]] = {"major": [], "high": [], "medium": [], "low": []}
            for error in all_errors:
                crit = error.get("official_criteria", "")
                if crit not in errors_by_criteria:
                    errors_by_criteria[crit] = []
                errors_by_criteria[crit].append(error)
                subcat = error.get("sub_category")
                if subcat:
                    errors_by_sub_category[subcat].append(error)
                sev = error.get("severity", "medium")
                if sev in errors_by_severity:
                    errors_by_severity[sev].append(error)

            scoring_details = {}
            for criterion, data in averaged_scoring.items():
                scoring_details[criterion] = {
                    "base_band": data.get("overall_score_a", 6.0),
                    "ceiling": data.get("overall_score", 6.0),
                    "ceiling_triggered_by": None,
                    "severity_counts": {
                        "major":  len([e for e in errors_by_criteria.get(criterion, []) if e.get("severity") == "major"]),
                        "high":   len([e for e in errors_by_criteria.get(criterion, []) if e.get("severity") == "high"]),
                        "medium": len([e for e in errors_by_criteria.get(criterion, []) if e.get("severity") == "medium"]),
                        "low":    len([e for e in errors_by_criteria.get(criterion, []) if e.get("severity") == "low"]),
                    },
                    "total_deductions":      0.0,
                    "score_before_rounding": data.get("overall_score", 6.0),
                    "final_score":           data.get("overall_score", 6.0),
                }

            result: dict = {
                "overall_band":    final_scores["overall_band"],
                "criteria_scores": final_scores["criteria_scores"],
                "breakdown":       breakdown,
                "summary":         summary,

                "scoring_round_a":  scoring_round_a,
                "scoring_round_b":  scoring_round_b,
                "averaged_scoring": averaged_scoring,
                "scoring_details":  scoring_details,

                "all_errors":              all_errors,
                "error_summary":           error_summary,
                "errors_by_criteria":      errors_by_criteria,
                "errors_by_sub_category":  dict(errors_by_sub_category),
                "errors_by_severity":      errors_by_severity,

                "revision_data": revision_data,
                "vocabulary":    vocabulary_data.get("vocabulary_enhancements", []),
                "grammar":       grammar_data,

                "letter_structure_analysis": letter_structure_data,
                "flow_logic_analysis":       flow_logic_data,

                "score":        str(final_scores["overall_band"]),
                "letter_type":  letter_type,
                "bullet_points": bullet_points or [],
                "opening_line": opening_line,
            }

            report_path = self._save_comprehensive_report(
                result, exam_name, letter_prompt, user_answer,
                letter_type=letter_type, bullet_points=bullet_points,
                opening_line=opening_line,
            )
            if report_path:
                result["report_saved_to"] = report_path

            logger.info("\n" + "=" * 80)
            logger.info("GRADING COMPLETE")
            logger.info(f"  Overall Band  : {final_scores['overall_band']}")
            logger.info(f"  Errors found  : {len(all_errors)}")
            logger.info(f"  Vocabulary    : {len(merged_vocab)} items (3 batches)")
            logger.info(f"  Letter type   : {letter_type}")
            logger.info(f"  Architecture  : 20-call mega-batch | Scoring-A×4 | LetterStruct×2 | Flow×3 | Vocab×3")
            logger.info("=" * 80)

            return result

        except Exception as e:
            logger.exception("Critical error in grading")
            return {
                "score":        "Error",
                "overall_band": 0.0,
                "error":        str(e),
                "breakdown":    {},
                "summary":      f"Error during grading: {str(e)}",
            }


# ============================================================================
# CLI ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--exam-name",   type=str, default="IELTS Writing Task 1 - General")
    parser.add_argument("--prompt",      type=str, required=True)
    parser.add_argument("--user-answer", type=str, required=True)
    parser.add_argument(
        "--bullet-points",
        type=str,
        default="",
        help="JSON array string of bullet points"
    )
    parser.add_argument(
        "--letter-type",
        type=str,
        default="formal",
        choices=["formal", "semi-formal", "informal"],
        help="The register of the letter"
    )
    parser.add_argument(
        "--opening-line",
        type=str,
        default="",
        help="The opening line or scenario context"
    )
    args = parser.parse_args()

    bullet_points: Optional[List[str]] = None
    if args.bullet_points:
        try:
            bullet_points = json.loads(args.bullet_points)
        except json.JSONDecodeError:
            logger.warning("Could not parse --bullet-points as JSON.")

    api_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not api_key:
        logger.error(
            "OPENAI_API_KEY is not set. Put it in .env at the project root "
            "(see .env.example) or export OPENAI_API_KEY."
        )
        sys.exit(1)

    grader = IELTSLetterGrader(api_key=api_key)
    result = asyncio.run(grader.grade_letter(
        user_answer=args.user_answer,
        letter_prompt=args.prompt,
        bullet_points=bullet_points,
        letter_type=args.letter_type,
        opening_line=args.opening_line,
        exam_name=args.exam_name,
    ))
    print(json.dumps(result))