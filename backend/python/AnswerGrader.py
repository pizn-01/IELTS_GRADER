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
SCORING_MODEL_A        = "gpt-4.1"
SCORING_MODEL_B        = "gpt-5-mini"
ERROR_DETECTION_MODEL  = "gpt-5.2"
VOCABULARY_MODEL       = "gpt-5.2"
GRAMMAR_MODEL          = "gpt-5-mini"
REVISION_MODEL         = "gpt-5-mini"
ARGUMENTATION_MODEL    = "gpt-5.2"
FLOW_LOGIC_MODEL       = "gpt-5.2"

DEFAULT_MODEL = SCORING_MODEL_B

ERROR_DETECTION_TEMPERATURE_GPT4 = 0.2

# ============================================================================
# COMPREHENSIVE ERROR TAXONOMY - Hierarchical Structure
# ============================================================================
ERROR_TAXONOMY = {
    "task_type": "IELTS Writing Task 2 - Essay",
    "hierarchy": [
        {
            "official_criteria": "Task Response",
            "sub_categories": [
                {
                    "name": "Coverage",
                    "tags": [
                        {
                            "id": "task_achievement_partial",
                            "label": "Task Achievement Partial",
                            "severity": "major",
                            "band_impact": -1.5,
                            "description": "Essay fails to address all parts of the prompt (e.g., misses the 'advantages' part).",
                            "detection_hint": "Structured prompt-check for all required parts (Discuss both views, etc). SCOPE: whole essay — confirm a required part is absent from the full response before flagging.",
                            "example_triggers": ["Prompt asked for causes and solutions, essay only discusses causes"]
                        }
                    ]
                },
                {
                    "name": "Position",
                    "tags": [
                        {
                            "id": "position_unclear_or_inconsistent",
                            "label": "Unclear or Inconsistent Position",
                            "severity": "high",
                            "band_impact": -1.25,
                            "description": "The writer's opinion is missing or changes throughout the essay.",
                            "detection_hint": "Contradictory stance detection; position drift between paragraphs. SCOPE: whole essay — compare intro, body, and conclusion.",
                            "example_triggers": ["Agreeing in the intro but arguing the opposite in the body"]
                        }
                    ]
                },
                {
                    "name": "Development",
                    "tags": [
                        {
                            "id": "ideas_underdeveloped",
                            "label": "Ideas Underdeveloped",
                            "severity": "high",
                            "band_impact": -0.75,
                            "description": "Arguments are stated but not supported by explanations or examples.",
                            "detection_hint": "Short claims lacking depth; single-sentence paragraphs with no support. SCOPE: full paragraph minimum — NEVER flag a claim sentence if the same paragraph continues with reasons, examples, or elaboration. Only flag when the paragraph as a whole lacks support.",
                            "example_triggers": [
                                "Governments should pay for it because it is good for society. (No explanation)",
                                "A body paragraph that is only one claim with no follow-up support"
                            ]
                        }
                    ]
                },
                {
                    "name": "Relevance",
                    "tags": [
                        {
                            "id": "irrelevant_or_off_topic_content",
                            "label": "Irrelevant or Off-topic Content",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Content deviates from the specific question asked in the prompt.",
                            "detection_hint": "Topic similarity score vs prompt below threshold; use of memorized filler.",
                            "example_triggers": ["Writing about global warming when the prompt asks for education funding"]
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
                            "band_impact": -0.75,
                            "description": "Missing a final summary or a conclusion that introduces new, unrelated ideas.",
                            "detection_hint": "No concluding paragraph or final summary found. SCOPE: whole essay — check the final paragraph(s) after reading the full text.",
                            "example_triggers": ["Intro and body are present, but the essay ends abruptly after the last point"]
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
                            "severity": "major",
                            "band_impact": -1.5,
                            "description": "The essay lacks a standard academic format (Intro, 2-3 Body Paragraphs, Conclusion).",
                            "detection_hint": "Missing or incorrectly ordered essay sections. SCOPE: whole essay.",
                            "example_triggers": ["Essay is one long block of text with no indentations or breaks"]
                        },
                        {
                            "id": "weak_topic_sentence",
                            "label": "Weak Topic Sentence",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "The first sentence of a paragraph doesn't clearly state the main argument of that paragraph.",
                            "detection_hint": "Paragraph starting with vague or filler text not introducing the main claim. SCOPE: full paragraph — judge the opening against what the rest of the paragraph develops.",
                            "example_triggers": ["Paragraph starts with 'Now I will talk about another thing.'"]
                        },
                        {
                            "id": "fragment",
                            "label": "Sentence Fragment",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Incomplete sentences, often starting with subordinators like 'Because' or 'Which'.",
                            "detection_hint": "Subordinate clause acting as a standalone sentence.",
                            "example_triggers": ["Because technology is evolving rapidly. (Fragment)"]
                        }
                    ]
                },
                {
                    "name": "Paragraphing",
                    "tags": [
                        {
                            "id": "paragraph_unity",
                            "label": "Paragraph Unity Failure",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Including multiple conflicting arguments within the same paragraph.",
                            "detection_hint": "Abrupt shifts between unrelated ideas within a single paragraph block. SCOPE: full paragraph — read the entire paragraph before flagging.",
                            "example_triggers": ["A paragraph discusses environmental benefits then suddenly shifts to economic costs"]
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
                            "band_impact": -1.25,
                            "description": "A breakdown in logic between arguments, making it hard to follow the writer's reasoning.",
                            "detection_hint": "Semantic jumps between sentences; low cohesion scores.",
                            "example_triggers": ["Education is important. Therefore, cars should be cheaper. (No link)"]
                        },
                        {
                            "id": "run_on",
                            "label": "Run-on / Fused Sentences",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Independent clauses fused together without appropriate conjunctions or full stops.",
                            "detection_hint": "Very long sentences with no clear boundaries or transitional punctuation.",
                            "example_triggers": ["I believe education is free for all it would improve the world."]
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
                            "description": "Excessive or mechanical use of connectors like 'Firstly', 'Secondly', and 'Finally'.",
                            "detection_hint": "Repetitive use of the same connective at sentence starts.",
                            "example_triggers": ["Starting every single paragraph and sentence with a formal linker"]
                        },
                        {
                            "id": "underuse_linkers",
                            "label": "Underuse of Linking Words",
                            "severity": "medium",
                            "band_impact": -0.75,
                            "description": "The essay feels choppy and disconnected due to a lack of transitional phrases.",
                            "detection_hint": "Low frequency of transitional markers between paragraphs.",
                            "example_triggers": ["No linkers between major shifts in argumentation"]
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
                            "band_impact": -0.75,
                            "description": "Abstract pronouns (e.g., 'this', 'that', 'it') used without a clear previously stated noun.",
                            "detection_hint": "Failure to resolve pronoun antecedents; ambiguous 'this'.",
                            "example_triggers": ["This leads to a problem. (What is 'this'?)"]
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
                            "band_impact": -0.75,
                            "description": "Repeating simple vocabulary instead of using higher-level synonyms.",
                            "detection_hint": "Lack of lexical variety; high lemmatization repetition.",
                            "example_triggers": ["Using the word 'money' 15 times in an essay about economics"]
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
                            "band_impact": -0.75,
                            "description": "Using words that do not accurately convey the nuanced meaning intended.",
                            "detection_hint": "Semantic similarity mismatch; word sense errors in academic context.",
                            "example_triggers": ["Using 'enormous' when 'critical' or 'essential' was meant"]
                        },
                        {
                            "id": "collocation",
                            "label": "Collocation Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Pairing words in an un-academic or unnatural way.",
                            "detection_hint": "Flagging low PMI pairs (e.g., 'take a decision' vs 'make a decision').",
                            "example_triggers": ["broadly agree → strongly agree"]
                        },
                        {
                            "id": "awkward_phrase",
                            "label": "Awkward Phrase",
                            "severity": "low",
                            "band_impact": -0.25,
                            "description": "Word combinations that are difficult to read or sound like direct translation.",
                            "detection_hint": "Language model flags low-fluency combinations.",
                            "example_triggers": ["He has much knowledge for it → He is highly knowledgeable"]
                        },
                        {
                            "id": "wrong_word_form",
                            "label": "Wrong Word Form",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Incorrect word endings (e.g., using an adjective when a noun is needed).",
                            "detection_hint": "POS mismatch between expected and actual form.",
                            "example_triggers": ["It is a great important → importance"]
                        },
                        {
                            "id": "typo_wordform",
                            "label": "Typo Affecting Word Form",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Spelling errors that change the form of the word, potentially changing its function.",
                            "detection_hint": "Edit distance=1 changing meaning/POS.",
                            "example_triggers": ["though → thought; expect → except"]
                        }
                    ]
                },
                {
                    "name": "Register",
                    "tags": [
                        {
                            "id": "register_informal",
                            "label": "Inappropriate Register (Informal)",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Using contractions (don't, can't) or slang in an academic essay.",
                            "detection_hint": "Slang, colloquialisms, or contractions in a formal academic context.",
                            "example_triggers": ["I think it's a bunch of nonsense. (Informal vocabulary)"]
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
                            "description": "Incorrect spelling of complex or abstract vocabulary.",
                            "detection_hint": "Automated spell-check; focus on systematic/repeated errors.",
                            "example_triggers": ["goverment → government; enviroment → environment"]
                        }
                    ]
                }
            ]
        },
        {
            "official_criteria": "Grammatical Range & Accuracy",
            "sub_categories": [
                {
                    "name": "Accuracy",
                    "tags": [
                        {
                            "id": "subject_verb_agreement",
                            "label": "Subject-Verb Agreement",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Failure of plural/singular agreement in complex sentences.",
                            "detection_hint": "Dependency parse error between subject and main verb.",
                            "example_triggers": ["The group of students were → was"]
                        },
                        {
                            "id": "article_determiner",
                            "label": "Article/Determiner Error",
                            "severity": "medium",
                            "band_impact": -0.75,
                            "description": "Misuse of articles in abstract generalizations.",
                            "detection_hint": "Wrong usage of 'the' vs zero article in academic context.",
                            "example_triggers": ["The technology is useful → Technology is useful"]
                        },
                        {
                            "id": "tense_aspect",
                            "label": "Tense/Aspect Error",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Inconsistent or incorrect tense usage throughout the essay.",
                            "detection_hint": "Sudden shifts in tense within an argumentative paragraph.",
                            "example_triggers": ["If people worked hard, they will succeed. (Condition mismatch)"]
                        },
                        {
                            "id": "plural_singular",
                            "label": "Plural/Singular Form Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Errors in number for nouns or uncountable concepts.",
                            "detection_hint": "Noun mismatch with quantifiers like 'many' or 'much'.",
                            "example_triggers": ["various technologys → various technologies"]
                        },
                        {
                            "id": "preposition",
                            "label": "Preposition Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Incorrect preposition usage in complex academic phrases.",
                            "detection_hint": "Collocation database check for prepositions.",
                            "example_triggers": ["depend of → depend on"]
                        },
                        {
                            "id": "pronoun_case",
                            "label": "Pronoun Case Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Confusion in pronoun choice for formal subject/object roles.",
                            "detection_hint": "Subject/object confusion after prepositions.",
                            "example_triggers": ["It is important for he and I → him and me"]
                        },
                        {
                            "id": "word_order",
                            "label": "Word Order Error",
                            "severity": "high",
                            "band_impact": -0.75,
                            "description": "Misplacing adverbs or parts of complex verb structures.",
                            "detection_hint": "Low probability word sequences for academic English.",
                            "example_triggers": ["They always are happy → They are always happy"]
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
                            "description": "Errors in capitalizing the first word of a sentence or proper nouns.",
                            "detection_hint": "Sentence-initial and proper noun rules check.",
                            "example_triggers": ["the internet → the Internet; friday → Friday"]
                        },
                        {
                            "id": "punctuation_comma",
                            "label": "Comma Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Errors with commas in complex and compound sentences.",
                            "detection_hint": "Comma splice detection or missing commas after adverbial clauses.",
                            "example_triggers": ["However it is true that... → However, it is true that..."]
                        },
                        {
                            "id": "punctuation_sentence_boundary",
                            "label": "Sentence Boundary Error",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Run-on sentences or missing full stops between arguments.",
                            "detection_hint": "Sentence fragments > 50 tokens; fused sentences.",
                            "example_triggers": ["Arguments exist on both sides for example..."]
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
                            "description": "Participial phrases that do not clearly relate to the sentence subject.",
                            "detection_hint": "Adverbial modifier with no clear subject link.",
                            "example_triggers": ["Having studied abroad, the benefits are clear. (Dangling)"]
                        }
                    ]
                },
                {
                    "name": "Consistency",
                    "tags": [
                        {
                            "id": "parallelism",
                            "label": "Parallelism Error",
                            "severity": "low",
                            "band_impact": -0.25,
                            "description": "Using inconsistent grammatical forms in a list of reasons or benefits.",
                            "detection_hint": "Coordinate structures differ across items.",
                            "example_triggers": ["Reading helps to learn, growing, and to understand."]
                        }
                    ]
                },
                {
                    "name": "Range",
                    "tags": []
                }
            ]
        }
    ]
}

SUB_ITEM_ERROR_MAPPING = {
    "Task Response": {
        "Coverage": ["task_achievement_partial"],
        "Position": ["position_unclear_or_inconsistent"],
        "Development": ["ideas_underdeveloped"],
        "Relevance": ["irrelevant_or_off_topic_content"],
        "Conclusion": ["weak_or_missing_conclusion"]
    },
    "Coherence & Cohesion": {
        "Structure": ["poor_overall_structure", "weak_topic_sentence", "fragment"],
        "Paragraphing": ["paragraph_unity"],
        "Progression": ["logical_progression_gap", "run_on"],
        "Cohesive Devices": ["overuse_linkers", "underuse_linkers"],
        "Referencing": ["unclear_referencing"]
    },
    "Lexical Resource": {
        "Range": ["repetition_basic_lexis"],
        "Word Choice": ["imprecise_word_choice", "collocation", "awkward_phrase", "wrong_word_form", "typo_wordform"],
        "Register": ["register_informal"],
        "Paraphrasing": ["repetition_basic_lexis"],
        "Spelling": ["misspelling"]
    },
    "Grammatical Range & Accuracy": {
        "Range": [],
        "Accuracy": ["subject_verb_agreement", "article_determiner", "tense_aspect", "plural_singular", "preposition", "pronoun_case", "word_order"],
        "Punctuation": ["capitalization", "punctuation_comma", "punctuation_sentence_boundary"],
        "Complexity": ["modifier_error"],
        "Consistency": ["parallelism"]
    }
}

# ============================================================================
# ROBUST JSON REPAIR UTILITIES
# ============================================================================

def _attempt_json_repair(raw_text: str) -> Optional[dict]:
    if not raw_text:
        return None

    stripped = re.sub(r'^```(?:json)?\s*', '', raw_text.strip(), flags=re.MULTILINE)
    stripped = re.sub(r'\s*```$', '', stripped.strip(), flags=re.MULTILINE)

    for candidate in [stripped, raw_text]:
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

        match = re.search(r'(\{.*\})', candidate, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        try:
            fixed = re.sub(r',\s*([}\]])', r'\1', candidate)
            return json.loads(fixed)
        except json.JSONDecodeError:
            pass

        try:
            fixed = re.sub(r',\s*([}\]])', r'\1', candidate)
            fixed = fixed.replace("'", '"')
            return json.loads(fixed)
        except json.JSONDecodeError:
            pass

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

class IELTSGrader:
    def __init__(self, api_key):
        self.client = openai.AsyncOpenAI(api_key=api_key)
        try:
            self.encoding = tiktoken.encoding_for_model("gpt-4o")
        except KeyError:
            self.encoding = tiktoken.get_encoding("cl100k_base")
        self.error_taxonomy = ERROR_TAXONOMY
        self._taxonomy_cache: Dict[str, str] = {}

    def _count_tokens(self, text: str) -> int:
        return len(self.encoding.encode(text))

    def _get_model_config(self, model: str) -> Dict[str, Any]:
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
        result = _attempt_json_repair(text)
        if result is not None:
            return result
        logger.error(f"All JSON repair strategies failed. Raw text snippet: {text[:300]}...")
        return {}

    def _generate_full_taxonomy_reference(self) -> str:
        return self._generate_criterion_taxonomy_reference(None)

    def _generate_criterion_taxonomy_reference(self, criterion_name: Optional[str]) -> str:
        cache_key = criterion_name or "ALL"
        if cache_key in self._taxonomy_cache:
            return self._taxonomy_cache[cache_key]

        ref = "=== ERROR TAXONOMY ===\n\n"
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

    async def _detect_errors_for_criterion(
        self, user_answer: str, essay_prompt: str, criterion_name: str
    ) -> List[dict]:
        taxonomy_ref = self._generate_criterion_taxonomy_reference(criterion_name)

        system_prompt = f"""You are a forensic IELTS error specialist trained to find every deviation
from perfect academic English in student essays.

YOUR SINGLE FOCUS TODAY: **{criterion_name}**

This is your ONLY task. Be exhaustively thorough for this one criterion.

YOUR GOAL: Find every genuine error — major and minor.

# ACCURACY RULES:
# - Only use error IDs that exist in the taxonomy below — no invented categories
# - If something is acceptable in formal academic English, do NOT flag it

COMPLETENESS RULES (prevent misses):
- Do not stop at obvious errors — check every sentence and word for subtle issues too, all count, all must be reported
- Minor errors (low severity) are still errors — include them

CONTEXT SCOPE BY ERROR TYPE (apply ONLY to the listed IDs — do not generalize to other tags):
Most tags are SHORT-SPAN (phrase/sentence): grammar, punctuation, spelling, articles, prepositions,
word form, imprecise_word_choice, collocation, awkward_phrase, register_informal, misspelling, etc.
Judge those at the local phrase/sentence — do NOT require whole-paragraph or whole-essay context.

PARAGRAPH-SCOPE IDs only (read the FULL paragraph before flagging):
- ideas_underdeveloped, paragraph_unity, logical_progression_gap, weak_topic_sentence

WHOLE-ESSAY-SCOPE IDs only (read the FULL essay before flagging):
- task_achievement_partial, position_unclear_or_inconsistent, weak_or_missing_conclusion, poor_overall_structure

PATTERN-ACROSS-TEXT IDs only (scan the full text for frequency/patterns, not for "development"):
- repetition_basic_lexis, overuse_linkers, underuse_linkers

ABSOLUTE RULE — ideas_underdeveloped only:
A claim sentence is NOT underdeveloped if the same paragraph continues with explanation, reasons,
examples, or elaboration. Only flag when the paragraph (or body section) as a WHOLE asserts an idea
without supporting development. original_text may quote the claim, but your explanation MUST confirm
you checked the rest of the paragraph and state what support is missing.

The correct number of errors is however many actually exist. There is no floor and no ceiling. Report exactly what you find.

CRITICAL OUTPUT RULES:
- Return ONLY a valid JSON object
- Every "original_text" must be a verbatim quote of 3–10 words from the essay
- Every error must map to a tag ID from the taxonomy below
"""

        checklists = {
            "Task Response": """
EXHAUSTIVE CHECKLIST – Task Response:
□ Does the essay address EVERY part of the prompt? (all required views / questions)
□ Is the writer's opinion stated clearly in the introduction?
□ Is the position maintained consistently across ALL body paragraphs?
□ Are ALL claims supported by specific explanations or examples?
□ Is any content off-topic or irrelevant to the specific prompt wording?
□ Does the conclusion properly summarise the position without introducing new ideas?
□ Check for memorised content that doesn't fit this specific prompt
□ Check for underdeveloped single-sentence arguments lacking support
□ Check for any paragraph where the argument is asserted but never explained
□ ideas_underdeveloped SCOPE: for that tag only, read the ENTIRE paragraph before flagging — do not flag a claim if the same paragraph continues with support""",

            "Coherence & Cohesion": """
EXHAUSTIVE CHECKLIST – Coherence & Cohesion:
□ Is there a clear Intro → Body × N → Conclusion structure?
□ Does EVERY paragraph open with a clear topic sentence?
□ Does EVERY paragraph stay unified around one central idea?
□ Are ideas logically connected sentence-to-sentence?
□ Are cohesive devices (linkers) used appropriately – neither over- nor under-used?
□ Are all pronouns and demonstratives (this, that, it) clearly referencing a named noun?
□ Are there sentence fragments (subordinate clauses standing alone)?
□ Are there run-on / fused sentences without proper boundaries?
□ Are there logical jumps that make reasoning hard to follow?
□ Check EVERY paragraph transition for smoothness""",

            "Lexical Resource": """
EXHAUSTIVE CHECKLIST – Lexical Resource:
□ Count repetitions: flag any content word repeated 3+ times without variation
□ Are any words semantically imprecise or mismatched for context?
□ Are there collocation errors (unnatural word pairings)? Check every verb-noun pair.
□ Are there awkward phrases that suggest direct translation?
□ Are any words in the wrong grammatical form (adjective used as noun, etc.)?
□ Are there typos that change the word form or meaning?
□ Are contractions (don't, can't, it's) present anywhere?
□ Are there misspellings of any vocabulary words?
□ Is the vocabulary academic throughout – flag any informal/casual words
□ Are there vague words (things, stuff, a lot, very) that should be more precise?""",

            "Grammatical Range & Accuracy": """
EXHAUSTIVE CHECKLIST – Grammatical Range & Accuracy:
□ Check EVERY verb for subject-verb agreement with its subject
□ Check EVERY article (a / an / the / zero) for correctness
□ Check EVERY preposition for correct collocation
□ Check EVERY tense for consistency and grammatical correctness
□ Check EVERY noun for correct plural/singular form
□ Check EVERY pronoun case (he/him, I/me, etc.)
□ Check adverb placement and word order in ALL sentences
□ Check ALL punctuation: commas, full stops, capitals, sentence boundaries
□ Check ALL participial / relative clauses for dangling / misplaced modifiers
□ Check ALL list structures for parallelism
□ Check for missing commas after introductory clauses (e.g., "However it is..." → needs comma)"""
        }

        checklist = checklists.get(criterion_name, "□ Check all errors for this criterion thoroughly.")

        user_prompt = f"""
ESSAY PROMPT:
{essay_prompt}

USER ESSAY:
{user_answer}

{taxonomy_ref}

{checklist}

For EACH error you find, provide exactly these fields:
- error_id        : Exact tag ID from the taxonomy above
- error_label     : Label from the taxonomy
- official_criteria : Must be "{criterion_name}"
- sub_category    : Exact sub-category name from the taxonomy
- severity        : major | high | medium | low
- band_impact     : Numeric value from the taxonomy (negative float)
- location        : e.g. "Paragraph 2, Sentence 3"
- original_text   : EXACT verbatim quote (3–10 words) from the essay
- corrected_text  : The corrected version
- explanation     : Clear, specific reason this is an error
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
Re-read the essay one more time looking specifically for:
  1. Any imprecise or repeated vocabulary
  2. Any missing comma after 'However', 'Therefore', 'Furthermore', etc.
  3. Any vague pronoun reference ('this', 'it', 'they') without a clear antecedent
  4. Any paragraph whose topic sentence is weak or vague
If the essay is genuinely error-free for this criterion, return {{"errors": []}} — but only then.
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

    async def _perform_detailed_independent_scoring(
        self, user_answer: str, essay_prompt: str, model: str = SCORING_MODEL_A
    ) -> dict:
        include_summary = (model == SCORING_MODEL_B)

        system_prompt = f"""You are a senior IELTS examiner with 20+ years of experience.
You are scoring with {model}.

Provide detailed band scores (0.5 increments from 1.0 to 9.0) for:
1. Each MAIN criterion (4 total)
2. Each SUB-CATEGORY within each criterion

Be SPECIFIC and DETAILED. Provide concrete evidence and quotes from the essay.
Your scores must REFLECT THE ACTUAL QUALITY of the essay — do not default to the middle.

OFFICIAL IELTS BAND CALIBRATION (use these as concrete anchors):

TASK RESPONSE
  Band 9 : Fully addresses all parts; clear, consistent, fully developed position with precise support
  Band 8 : Sufficiently addresses all parts; well-developed position; minor gaps in development
  Band 7 : Addresses all parts; clear position; main ideas developed but some under-explained
  Band 6 : Addresses task but some parts inadequately covered; position clear but not always consistent
  Band 5 : Partially addresses task; position is present but limited/repetitive development
  Band 4 : Only minimally addresses task; position unclear; little development

COHERENCE & COHESION
  Band 9 : Seamless flow; cohesion invisible; perfect paragraphing; all referencing unambiguous
  Band 8 : Well-organised; cohesion rarely faulty; paragraphing effective; referencing mostly clear
  Band 7 : Clear progression; uses a range of cohesive devices; occasional over/under-use; paragraphing logical
  Band 6 : Arranges info coherently but mechanical use of connectives; inadequate paragraphing possible
  Band 5 : Some organisation; over-use of linkers or lack thereof; limited range of cohesive devices
  Band 4 : Limited organisation; connectives wrong or missing; paragraph structure weak

LEXICAL RESOURCE
  Band 9 : Full flexibility; precise collocations; no errors; sophisticated range
  Band 8 : Wide resource; sophisticated items; occasional minor errors in word choice/collocation
  Band 7 : Sufficient range; some less-common vocabulary; aware of style; some errors in word choice
  Band 6 : Adequate range; attempts less-common vocabulary; noticeable errors in word choice/collocation
  Band 5 : Limited range; basic vocabulary; repetition; errors may cause strain for reader
  Band 4 : Very limited range; errors in basic vocabulary; meaning sometimes obscured

GRAMMATICAL RANGE & ACCURACY
  Band 9 : Full range; rare errors; wide range of complex structures used naturally
  Band 8 : Wide range; majority error-free; occasional slips in complex structures
  Band 7 : Variety of structures; some complex forms; errors occur but rarely affect communication
  Band 6 : Mix of simple and complex; errors in complex structures; errors do not impede communication
  Band 5 : Limited range; frequent grammatical errors; may cause difficulty for reader
  Band 4 : Very limited range; errors dominate; communication frequently impeded

IMPORTANT: A Band 4–5 essay and a Band 8–9 essay must receive substantially different scores.
Do NOT converge toward 6.0–7.0 unless the essay genuinely falls in that range.
Score what you actually read, not what you expect the average essay to look like."""

        if not include_summary:
            user_prompt = f"""
ESSAY PROMPT: {essay_prompt}

USER ANSWER:
{user_answer}

Provide a DETAILED holistic assessment. For each criterion and sub-category below,
give: score, strengths, weaknesses, and evidence (specific quotes from the essay).

**TASK RESPONSE** – assess these 5 sub-categories:
  • Coverage: Does the essay address all parts of the task?
  • Position: Is the writer's opinion clear and consistent throughout?
  • Development: Are ideas fully developed with explanations and examples?
  • Relevance: Is all content directly relevant to the prompt?
  • Conclusion: Is there an appropriate conclusion that summarises the position?

**COHERENCE & COHESION** – assess these 5 sub-categories:
  • Structure: Is the essay properly organised (intro, body, conclusion)?
  • Paragraphing: Are paragraphs unified, well-structured, with clear topic sentences?
  • Progression: Do ideas flow logically from sentence to sentence and paragraph to paragraph?
  • Cohesive Devices: Are linking words used appropriately (neither over- nor under-used)?
  • Referencing: Are pronouns and references clear and unambiguous?

**LEXICAL RESOURCE** – assess these 4 sub-categories:
  • Range: Is there sufficient variety of vocabulary across the essay?
  • Word Choice: Are words precise, appropriate, and used in their correct sense?
  • Register: Is the tone consistently formal and academic?
  • Spelling: Are all words spelled correctly?

**GRAMMATICAL RANGE & ACCURACY** – assess these 5 sub-categories:
  • Range: Is there adequate variety of sentence structures and grammatical forms?
  • Accuracy: Are all grammatical structures used correctly and consistently?
  • Punctuation: Is punctuation (commas, full stops, capitals) used correctly?
  • Complexity: Are complex grammatical structures attempted and successfully controlled?
  • Consistency: Are grammatical forms used consistently (parallelism, tense, number)?

Return ONLY a valid JSON object exactly matching this structure:
{{
  "Task Response": {{
    "overall_score": 0.0,
    "overall_justification": "...",
    "sub_categories": {{
      "Coverage":    {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Position":    {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Development": {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Relevance":   {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Conclusion":  {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}}
    }}
  }},
  "Coherence & Cohesion": {{
    "overall_score": 0.0,
    "overall_justification": "...",
    "sub_categories": {{
      "Structure":        {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Paragraphing":     {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Progression":      {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Cohesive Devices": {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Referencing":      {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}}
    }}
  }},
  "Lexical Resource": {{
    "overall_score": 0.0,
    "overall_justification": "...",
    "sub_categories": {{
      "Range":      {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Word Choice":{{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Register":   {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Spelling":   {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}}
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
            user_prompt = f"""
ESSAY PROMPT: {essay_prompt}

USER ANSWER:
{user_answer}

Your two tasks:

1. Write an OVERALL SUMMARY of exactly 5 to 7 complete sentences. Cover ALL four criteria: Task Response, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy. For each criterion, identify one specific strength AND one specific weakness using precise, authentic language drawn from what you actually read in the essay. Do NOT use generic filler phrases such as "the essay demonstrates some strengths". Do NOT include any band scores or numeric grades in the summary.
2. Score each criterion (overall_score + overall_justification) and each
   sub-category (score only — no narratives needed from you).

BREVITY RULE: overall_justification for each criterion: max 35 words.

**TASK RESPONSE** – sub-categories: Coverage, Position, Development, Relevance, Conclusion
**COHERENCE & COHESION** – sub-categories: Structure, Paragraphing, Progression, Cohesive Devices, Referencing
**LEXICAL RESOURCE** – sub-categories: Range, Word Choice, Register, Spelling
**GRAMMATICAL RANGE & ACCURACY** – sub-categories: Range, Accuracy, Punctuation, Complexity, Consistency

Return ONLY a valid JSON object exactly matching this structure:
{{
  "overall_summary": "5-7 sentence overall assessment covering all four criteria with specific strengths and weaknesses for each...",
  "Task Response": {{
    "overall_score": 0.0,
    "overall_justification": "...",
    "sub_categories": {{
      "Coverage":    {{"score": 0.0}},
      "Position":    {{"score": 0.0}},
      "Development": {{"score": 0.0}},
      "Relevance":   {{"score": 0.0}},
      "Conclusion":  {{"score": 0.0}}
    }}
  }},
  "Coherence & Cohesion": {{
    "overall_score": 0.0,
    "overall_justification": "...",
    "sub_categories": {{
      "Structure":        {{"score": 0.0}},
      "Paragraphing":     {{"score": 0.0}},
      "Progression":      {{"score": 0.0}},
      "Cohesive Devices": {{"score": 0.0}},
      "Referencing":      {{"score": 0.0}}
    }}
  }},
  "Lexical Resource": {{
    "overall_score": 0.0,
    "overall_justification": "...",
    "sub_categories": {{
      "Range":       {{"score": 0.0}},
      "Word Choice": {{"score": 0.0}},
      "Register":    {{"score": 0.0}},
      "Spelling":    {{"score": 0.0}}
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
        criteria_list = [
            "Task Response",
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
                    "score":      avg_subcat,
                    "score_a":    sc_score_a,
                    "score_b":    sc_score_b,
                    "strengths":  sc_a.get("strengths",  ""),
                    "weaknesses": sc_a.get("weaknesses", ""),
                    "evidence":   sc_a.get("evidence",   ""),
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
        criteria_scores: Dict[str, float] = {}
        for criterion, data in averaged_scores.items():
            criteria_scores[criterion] = float(data.get("overall_score", 6.0))
        if criteria_scores:
            overall_avg = sum(criteria_scores.values()) / len(criteria_scores)
            overall_band = self._round_to_half_band(overall_avg)
        else:
            overall_band = 6.0
        return {"overall_band": overall_band, "criteria_scores": criteria_scores}

    def _calculate_sub_item_scores_with_reranker(
        self,
        criteria_name: str,
        errors: List[dict],
        category_score: float,
        averaged_scoring: dict,
    ) -> Dict[str, float]:
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

    def _round_to_half_band(self, score: float) -> float:
        whole = int(score)
        decimal = score - whole
        if decimal < 0.25:
            return float(whole)
        elif decimal < 0.75:
            return whole + 0.5
        else:
            return float(whole + 1)

    async def _generate_detailed_feedback(
        self,
        user_answer: str,
        essay_prompt: str,
        error_data: dict,
        final_scores: dict,
        averaged_scoring: dict,
    ) -> dict:
        errors_by_criteria: Dict[str, List[dict]] = {}
        for error in error_data.get("errors", []):
            crit = error.get("official_criteria", "")
            if crit not in errors_by_criteria:
                errors_by_criteria[crit] = []
            errors_by_criteria[crit].append(error)
        breakdown: dict = {}
        for criteria_name in [
            "Task Response",
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

    async def _generate_revision(self, user_answer: str, essay_prompt: str) -> dict:
        system_prompt = "You are an expert IELTS examiner and accomplished academic writer."
        user_prompt = f"""
    ESSAY PROMPT: {essay_prompt}

    ORIGINAL STUDENT ESSAY:
    {user_answer}

    TASK: Improve the student's essay above — do NOT write a new essay from scratch.
    Preserve the student's core ideas, argument structure, and general approach.
    Apply targeted corrections and upgrades in these areas:
    • Fix grammatical errors (tense, agreement, articles, prepositions)
    • Replace informal or imprecise vocabulary with academic alternatives
    • Strengthen topic sentences and logical flow between paragraphs
    • Ensure the position is clearly stated and maintained throughout
    • Add or sharpen supporting evidence/explanation where ideas are underdeveloped
    • Correct punctuation and spelling

    After revising, estimate the IELTS band score the improved essay would achieve (use 0.5 increments, 1.0–9.0).
    Base this honestly on the quality of the revised text — do NOT default to 9.0.

    For "key_improvements", list exactly 4 specific changes you made — each must reference
    what was wrong in the original and what was done to fix it in the revised version.
    Examples of good improvement entries:
    - "Replaced informal contraction 'don't' with 'do not' to maintain academic register"
    - "Strengthened topic sentence in Body Paragraph 2 from vague opener to clear claim"
    - "Added causal explanation to the education argument which previously lacked development"

    Return ONLY a valid JSON object:
    {{
    "revision": "The full improved essay text here, preserving the student's ideas...",
    "revised_score_line": "Improved Essay (Band X.X)",
    "word_count": 265,
    "key_improvements": [
        "Specific change 1: what was wrong → what was fixed",
        "Specific change 2: what was wrong → what was fixed",
        "Specific change 3: what was wrong → what was fixed",
        "Specific change 4: what was wrong → what was fixed"
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
    # CHANGE 1: VOCABULARY – 3 PARALLEL BATCHES
    # ------------------------------------------------------------------

    async def _generate_vocabulary_batch(
        self,
        user_answer: str,
        essay_prompt: str,
        batch_number: int,
        category_focus: str,
        category_labels: List[str],
    ) -> List[dict]:
        """
        Generate one batch of ~10 high-level vocabulary items focused on
        specific lexical categories. Three batches run in parallel and are
        merged by _generate_vocabulary to produce 30 total items.
        """
        vocab_system = (
            "You are an IELTS Vocabulary Enhancement Specialist. "
            "Your task is to provide targeted Band 8–9 vocabulary for IELTS Writing Task 2 essays. "
            "Respond only with a valid JSON object."
        )

        category_list_str = "\n".join(f"  - {c}" for c in category_labels)

        vocab_user = f"""
ESSAY PROMPT: {essay_prompt}
USER ANSWER: {user_answer}

TASK: Generate EXACTLY 10 high-level vocabulary items from the following categories ONLY:
{category_list_str}

STRICT RULES:
1. Every item MUST fall into one of the categories listed above — use those exact category names.
2. Every item MUST be completely absent from the user's essay.
3. Every item MUST be directly relevant to the essay topic.
4. Distribute items across ALL listed categories (do not concentrate on one category).
5. Each item must be at Band 8–9 level — sophisticated, precise, academic.

Return ONLY a valid JSON object:
{{
  "vocabulary_enhancements": [
    {{
      "word": "nurture",
      "type": "verb",
      "definition": "to care for and encourage the growth or development of something",
      "example": "Parents who nurture their children's critical thinking skills foster long-term academic success.",
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

    async def _generate_vocabulary(self, user_answer: str, essay_prompt: str) -> dict:
        """
        Runs 3 parallel vocabulary batch calls (10 items each) then merges
        and deduplicates to produce 30 high-level suggestions covering:
          Batch 1 → Topic-Specific Nouns & Verbs
          Batch 2 → Academic Adjectives + Adverbs & Collocations
          Batch 3 → Advanced Phrases + Discourse Expressions
        """
        batch_configs = [
            {
                "batch_number": 1,
                "category_focus": "Topic-Specific Nouns & Verbs",
                "category_labels": ["Topic-Specific Nouns", "Topic-Specific Verbs"],
            },
            {
                "batch_number": 2,
                "category_focus": "Academic Adjectives & Adverbs/Collocations",
                "category_labels": ["Academic Adjectives", "Adverbs & Collocations"],
            },
            {
                "batch_number": 3,
                "category_focus": "Advanced Phrases & Discourse Expressions",
                "category_labels": ["Advanced Phrases", "Discourse Expressions"],
            },
        ]

        batch_results = await asyncio.gather(*[
            self._generate_vocabulary_batch(
                user_answer, essay_prompt,
                cfg["batch_number"], cfg["category_focus"], cfg["category_labels"],
            )
            for cfg in batch_configs
        ])

        seen_words: set = set()
        merged: List[dict] = []
        for batch_items in batch_results:
            for item in batch_items:
                word_key = (item.get("word") or "").lower().strip()
                if word_key and word_key not in seen_words:
                    seen_words.add(word_key)
                    merged.append(item)

        logger.info(f"  → Vocabulary merged: {len(merged)} unique items from 3 batches.")
        return {"vocabulary_enhancements": merged}

    # ============================================================================
    # ARGUMENTATION ANALYSIS
    # ============================================================================

    async def _analyze_argument_structure(
        self, user_answer: str, essay_prompt: str
    ) -> dict:
        """
        COMPLETE VERSION - Includes all features from both summaries:
        - Argument structure mapping with evidence quality
        - Critical thinking depth analysis
        - Task alignment verification
        - Authenticity & pitfall detection (including mother tongue interference)
        - Introduction structure analysis (NEW)
        - Conclusion quality analysis (NEW)

        Returns visualization-ready data for the Argumentation Analysis tab.
        """
        system_prompt = """You are an IELTS argumentation expert analyzing essay structure and critical thinking.

Your task: Comprehensively map the argument architecture and assess reasoning quality.

CRITICAL: You are NOT detecting grammar/vocabulary errors. Focus ONLY on:
1. Introduction structure (position stated? thesis clear? preview?)
2. Argument structure mapping (claim → evidence → explanation chains)
3. Conclusion quality (summarizes? restates position? new ideas?)
4. Evidence quality assessment (concrete vs vague)
5. Critical thinking depth (surface vs sophisticated analysis)
6. Task alignment verification (did student answer the right question?)
7. Authenticity check (memorized phrases, over-generalizations, mother tongue interference)

For IELTS Task 2 essays, strong arguments have:
- Clear introduction with position statement and thesis
- Main claim stated in topic sentence
- Concrete evidence (specific examples, data, research)
- Explanation of HOW/WHY the evidence supports the claim
- Nuanced language (qualified statements, not absolutes)
- Proper conclusion that summarizes without introducing new ideas

Weak arguments have:
- Unclear or missing thesis statement
- Vague assertions without support
- Missing causal explanations
- Over-generalizations
- Memorized IELTS templates
- Mother tongue interference (non-English sentence patterns)
- Conclusions that introduce new arguments"""

        user_prompt = f"""
ESSAY PROMPT: {essay_prompt}

USER ESSAY:
{user_answer}

Conduct a comprehensive argumentation analysis:

═══════════════════════════════════════════════════════════════════════════
1. INTRODUCTION STRUCTURE ANALYSIS (NEW)
═══════════════════════════════════════════════════════════════════════════

Analyze the introduction paragraph:

**Position Statement:**
- Is the writer's position clearly stated? (Clear / Vague / Missing)
- Where is it located? (First sentence / Middle / End / Not found)
- Quote the position statement if present

**Thesis Statement:**
- Is there a clear thesis that previews the main arguments? (Yes / Partial / No)
- Does it forecast the essay structure?
- Quote the thesis if present

**Hook/Background:**
- Does intro provide context/background? (Yes / No)
- Is the hook engaging or generic?

**Overall Introduction Quality:** Rate 1-5 stars
**Recommendation:** How to improve the introduction

═══════════════════════════════════════════════════════════════════════════
2. ARGUMENT STRUCTURE MAP
═══════════════════════════════════════════════════════════════════════════

For EACH main argument (typically 2-3 body paragraphs), identify:

**Main Claim:** What is the central argument of this paragraph?

**Evidence Quality Rating (1-5 stars):**
★☆☆☆☆ = No evidence provided, just assertion
★★☆☆☆ = Vague example ("technology helps students")
★★★☆☆ = Concrete example but limited detail
★★★★☆ = Multiple specific examples or relevant data
★★★★★ = Research-backed, specific statistics/studies cited

**Explanation Depth:**
- Surface: Claim stated but no explanation of mechanism
- Developing: Some explanation but incomplete reasoning
- Sophisticated: Full causal chain explained (X leads to Y because Z)

**Missing Elements:** What would make this argument stronger?

**Overall Strength Score:** Rate 1.0-9.0 (IELTS band equivalent)

**Actionable Recommendation:** Specific improvement suggestion

═══════════════════════════════════════════════════════════════════════════
3. CONCLUSION QUALITY ANALYSIS (NEW)
═══════════════════════════════════════════════════════════════════════════

Analyze the conclusion paragraph:

**Summarizes Main Points:** Does it recap the key arguments? (Yes / Partial / No)

**Restates Position:** Is the writer's position clearly restated? (Yes / Vague / No)

**Introduces New Ideas:** Does it introduce NEW arguments not discussed in body? (Yes / No)
- If yes, list the new ideas introduced (this is a mistake)

**Closure Quality:** Does it provide proper closure? (Strong / Adequate / Weak)

**Overall Conclusion Quality:** Rate 1-5 stars

**Recommendation:** How to improve the conclusion

═══════════════════════════════════════════════════════════════════════════
4. CRITICAL THINKING ANALYSIS
═══════════════════════════════════════════════════════════════════════════

**Sophistication Band:** Overall critical thinking level (1.0-9.0)
**Sophistication Level:** Surface-level / Developing / Sophisticated

**Metrics:**
- Unsupported claims count (statements with no backing)
- Nuanced arguments count (qualified, balanced statements)
- Counterargument status (Missing / Weak / Present / Strong)
- Causal reasoning quality (Weak / Adequate / Strong)

**Evidence:**
Provide 1-2 examples showing:
- Surface claim → What sophisticated version would look like
- Weak reasoning → How to strengthen it

═══════════════════════════════════════════════════════════════════════════
5. TASK ALIGNMENT CHECK
═══════════════════════════════════════════════════════════════════════════

**Prompt Analysis:**
What type of task is this?
- Discuss both views and give opinion
- Agree or disagree  
- Advantages and disadvantages
- Causes and solutions
- Two-part question

**Student's Interpretation:**
Did the student correctly understand the task type?

**Required Elements Checklist:**
For "Discuss both views": 
  - View A discussed? (Complete / Incomplete / Missing)
  - View B discussed? (Complete / Incomplete / Missing)  
  - Opinion stated? (Clear / Vague / Missing)
  - Opinion justified? (Yes / No)

**Coverage Balance:**
For balanced tasks, estimate percentages:
Expected: View A 40% + View B 40% + Opinion 20%
Actual: View A ___% + View B ___% + Opinion ___%

**Misinterpretation Warning:**
If task was misunderstood, explain the error clearly

═══════════════════════════════════════════════════════════════════════════
6. AUTHENTICITY & PITFALL DETECTION (ENHANCED)
═══════════════════════════════════════════════════════════════════════════

**Memorized IELTS Phrases:**
Identify formulaic openers/connectors (max 5 examples):
- "In this modern era"
- "Last but not least"
- "It goes without saying"
- "There are both advantages and disadvantages"
Provide context where found + natural alternative

**Over-generalizations:**
Flag absolute statements without qualification:
- "Everyone knows..."
- "All students..."
- "It is always true that..."
Suggest qualified alternatives

**Mother Tongue Interference (NEW):**
Detect non-English sentence patterns or word order:
- Adjective placement errors
- Verb-subject inversion patterns
- Preposition usage influenced by native language
- Direct translation patterns
Provide examples with corrections

**Clichés & Overused IELTS Expressions:**
- "a double-edged sword"
- "play a pivotal role"
- "the pros and cons"
Flag and suggest fresh alternatives

**Formulaic vs Natural Ratio:**
Estimate % of essay that sounds templated vs authentic (0-100%)
Target for Band 8+: 80%+ natural

═══════════════════════════════════════════════════════════════════════════

Return ONLY valid JSON matching this exact structure:

{{
  "introduction_analysis": {{
    "position_statement_clarity": "Clear",
    "position_location": "First sentence",
    "position_quote": "I firmly believe that technology should be integrated into modern education",
    "thesis_present": "Yes",
    "thesis_forecasts_structure": true,
    "thesis_quote": "This essay will discuss both the benefits and drawbacks of educational technology before reaching a conclusion",
    "provides_background": true,
    "hook_quality": "Generic",
    "overall_quality_stars": 4,
    "strengths": ["Clear position stated"],
    "weaknesses": ["Generic hook"],
    "recommendation": "Replace generic opening with specific statistic or recent event: 'Since 2020, online learning platforms have grown by 400%, raising questions about technology's role in education.'"
  }},
  "argument_map": [
    {{
      "paragraph": "Body Paragraph 1",
      "main_claim": "Technology improves educational access for students in remote areas",
      "evidence_quality_stars": 3,
      "evidence_quality_text": "Concrete example (online courses) but lacks specific data or statistics",
      "explanation_depth": "Developing",
      "explanation_note": "Explains WHAT technology does but not HOW it specifically improves access",
      "missing_elements": [
        "Specific example (e.g., Khan Academy usage statistics)"
      ],
      "strength_score": 6.0,
      "recommendation": "Add concrete example: 'For instance, platforms like Coursera have enrolled over 100 million learners globally.' Then explain the mechanism: 'This works because students can access lectures anytime without commuting.'"
    }}
  ],
  "conclusion_analysis": {{
    "summarizes_main_points": "Partial",
    "summarizes_note": "Mentions technology benefits but omits drawbacks discussion",
    "restates_position": "Yes",
    "position_quote": "Therefore, technology should be carefully integrated into education",
    "introduces_new_ideas": true,
    "new_ideas_introduced": [
      "Government funding (not discussed in body paragraphs)"
    ],
    "closure_quality": "Weak",
    "overall_quality_stars": 2,
    "strengths": ["Position restated"],
    "weaknesses": ["Incomplete summary"],
    "recommendation": "Rewrite to summarize ONLY arguments discussed. Remove new ideas about funding."
  }},
  "critical_thinking": {{
    "sophistication_band": 6.5,
    "sophistication_level": "Developing",
    "unsupported_claims_count": 3,
    "unsupported_claims_examples": [
      "Technology makes students smarter (no evidence provided)"
    ],
    "nuanced_arguments_count": 1,
    "nuanced_example": "While technology offers accessibility benefits, over-reliance may reduce face-to-face social skills",
    "counterargument_status": "Missing",
    "counterargument_note": "Essay only presents benefits of technology without addressing potential drawbacks or opposing viewpoints",
    "causal_reasoning": "Adequate",
    "causal_reasoning_note": "Some cause-effect relationships mentioned but mechanisms not fully explained",
    "depth_comparison": {{
      "surface_example": "Technology is useful for education",
      "improved_example": "Technology enhances educational outcomes by providing personalized learning paths, leading to 34% higher retention rates according to MIT studies."
    }}
  }},
  "task_alignment": {{
    "prompt_type_identified": "Discuss both views and give your opinion",
    "prompt_type_student_treated_as": "Advantages and disadvantages",
    "correctly_interpreted": false,
    "required_elements": [
      {{
        "element": "Discuss View A (technology benefits education)",
        "status": "Complete",
        "coverage_percentage": 65,
        "note": "Well-developed with multiple examples"
      }}
    ],
    "balance_score": 3.5,
    "balance_explanation": "Heavily skewed toward one view (65-15-10 split instead of expected 40-40-20)",
    "misinterpretation_warning": "The prompt asks you to discuss BOTH views equally before giving your opinion. Aim for balanced coverage.",
    "task_type_guide": "For 'Discuss both views' tasks: Para 1 intro + position, Para 2 View A, Para 3 View B, Para 4 Your opinion, Para 5 conclusion"
  }},
  "authenticity": {{
    "memorized_phrases": [
      {{
        "phrase": "In this modern era",
        "location": "Introduction, Sentence 1",
        "context": "In this modern era, technology plays a crucial role...",
        "issue": "Overused IELTS template opener",
        "suggested_fix": "Use 'Currently' / 'In recent years' / 'Today' or start directly with your argument"
      }}
    ],
    "overgeneralizations": [
      {{
        "text": "Everyone knows that technology is essential for modern education",
        "location": "Introduction",
        "issue": "Universal claim ('everyone') without supporting data",
        "suggested_fix": "Research indicates that technology has become increasingly important in modern education"
      }}
    ],
    "mother_tongue_interference": [
      {{
        "text": "Very important is education for children",
        "location": "Body Paragraph 2, Sentence 3",
        "issue": "Non-English word order (adjective-verb inversion)",
        "language_pattern": "SOV or topic-prominent structure",
        "suggested_fix": "Education is very important for children",
        "explanation": "English follows SVO (Subject-Verb-Object) word order strictly in declarative sentences"
      }}
    ],
    "cliches_detected": [
      {{
        "phrase": "a double-edged sword",
        "location": "Body Paragraph 2",
        "issue": "Overused IELTS cliché",
        "suggested_fix": "Use fresh expression: 'presents both opportunities and challenges' / 'carries inherent trade-offs'"
      }}
    ],
    "formulaic_vs_natural_percentage": 45,
    "authenticity_score": 55,
    "authenticity_note": "45% of essay uses memorized IELTS templates and formulaic phrases. For Band 8+, aim for 80%+ natural, authentic academic expression."
  }},
  "overall_summary": "Essay demonstrates developing argumentation skills (Band 6.5) with clear structure but significant gaps. Introduction clearly states position but uses generic opening. Body paragraphs present arguments with moderate evidence quality (★★★☆☆ average) but lack sophisticated causal explanations. Reduce memorized phrases (45% of essay) and add specific evidence with causal explanations to reach Band 7+."
}}

REMEMBER: Return ONLY the JSON object, nothing else.
"""

        raw = await self._call_ai(
            system_prompt, user_prompt,
            task_name="ArgumentationAnalysis",
            model=ARGUMENTATION_MODEL,
            json_mode=True,
        )

        result = self._clean_json(raw)
        logger.info(f"  → Argumentation analysis complete: "
                    f"{len(result.get('argument_map', []))} arguments mapped, "
                    f"CT band {result.get('critical_thinking', {}).get('sophistication_band', 'N/A')}, "
                    f"Intro {result.get('introduction_analysis', {}).get('overall_quality_stars', 'N/A')}★, "
                    f"Conclusion {result.get('conclusion_analysis', {}).get('overall_quality_stars', 'N/A')}★")
        return result


    async def _analyze_flow_and_logic(
        self, user_answer: str, essay_prompt: str
    ) -> dict:
        """
        COMPLETE VERSION - Includes all features from both summaries:
        - Paragraph-to-paragraph flow analysis
        - Sentence-to-sentence flow within paragraphs (NEW)
        - Logical fallacy detection
        - Register & tone consistency tracking
        - Cohesion quality matrix (pronouns, devices, topic sentences)
        - Paragraph unity analysis

        Returns visualization-ready data for the Flow & Logic Analysis tab.
        """
        system_prompt = """You are an IELTS coherence expert analyzing essay flow and logical connections.

Your task: Assess logical progression and structural coherence at BOTH paragraph and sentence levels.

CRITICAL: You are NOT detecting individual cohesive device errors. Focus ONLY on:
1. Paragraph-to-paragraph flow strength (transition quality between paragraphs)
2. Sentence-to-sentence flow within paragraphs (NEW - internal coherence)
3. Logical coherence (reasoning gaps, fallacies)
4. Register & tone consistency (formality maintenance across essay)
5. Cohesion patterns (pronoun clarity, device variety, topic sentence effectiveness)
6. Paragraph unity (single focus maintenance)

Strong coherence features:
- Smooth transitions between AND within paragraphs
- Consistent academic register throughout
- Clear pronoun references
- Varied cohesive devices (not mechanical repetition)
- Strong topic sentences that forecast paragraph content
- Logical sentence progression within each paragraph

Weak coherence features:
- Abrupt paragraph OR sentence-level shifts
- Tone/register inconsistency
- Ambiguous pronouns ("this" without clear referent)
- Overuse of same connectors
- Vague topic sentences
- Disjointed sentence flow within paragraphs"""

        user_prompt = f"""
ESSAY PROMPT: {essay_prompt}

USER ESSAY:
{user_answer}

Conduct a comprehensive flow and logic analysis:

═══════════════════════════════════════════════════════════════════════════
1. PARAGRAPH-TO-PARAGRAPH FLOW ANALYSIS
═══════════════════════════════════════════════════════════════════════════

For EACH transition (Intro→Para1, Para1→Para2, Para2→Para3, Para3→Conclusion):

**Flow Strength:** 0-100% (how smoothly does one paragraph connect to the next?)
0-30%: Abrupt, jarring shift
30-60%: Weak connection
60-80%: Adequate transition
80-100%: Smooth, natural flow

**Quality:** Smooth / Adequate / Weak / Abrupt

**Reason:** WHY is it smooth or abrupt? What makes the connection work/fail?

**Logical Gap (if present):** What missing link would improve the connection?

**Transition Device Present:** Yes/No - is there a connector (However, Furthermore, etc.)?

**Suggestion:** If weak, how to improve?

═══════════════════════════════════════════════════════════════════════════
2. SENTENCE-TO-SENTENCE FLOW ANALYSIS (NEW - Within Each Paragraph)
═══════════════════════════════════════════════════════════════════════════

For EACH body paragraph, analyze the internal flow between consecutive sentences:

Example format:
Para 2:
  S1 → S2: Flow strength 85% (Smooth - causal link with "therefore")
  S2 → S3: Flow strength 40% (Weak - topic shift without transition)
  S3 → S4: Flow strength 90% (Smooth - example follows claim naturally)

For each sentence transition within a paragraph:
- Flow strength (0-100%)
- Quality (Smooth / Adequate / Weak / Abrupt)
- Reason (why smooth or abrupt)
- Cohesive link present (Yes/No - is there a connecting word/phrase?)

This helps identify choppy writing within otherwise good paragraphs.

═══════════════════════════════════════════════════════════════════════════
3. LOGICAL COHERENCE & FALLACY DETECTION
═══════════════════════════════════════════════════════════════════════════

Identify any logical fallacies or reasoning errors:

**Common IELTS Fallacies:**
- False Dichotomy: Presenting only 2 options when more exist
- Hasty Generalization: Single example → universal conclusion
- Non Sequitur: Conclusion doesn't logically follow from premise
- Circular Reasoning: Conclusion restates premise
- Appeal to Emotion: Relies on feelings rather than logic
- Slippery Slope: X will inevitably lead to Z without evidence
- Ad Hominem: Attacking person instead of argument

For each fallacy found, provide:
- Type of fallacy
- Location in essay
- Exact problematic text
- Explanation of the logical error
- Impact on argument credibility
- Suggested revision

═══════════════════════════════════════════════════════════════════════════
4. REGISTER & TONE CONSISTENCY
═══════════════════════════════════════════════════════════════════════════

**Overall Consistency Score:** 0-100%
**Rating:** Fully consistent / Mostly consistent / Inconsistent

**Per-Paragraph Formality Scores:**
For each paragraph, rate formality 0-100%:
100% = Fully academic (no contractions, formal vocabulary, objective tone)
50-99% = Mostly academic with minor lapses
0-49% = Casual/informal language dominates

**Informal Language Hotspots:**
Identify specific instances where register drops:
- Contractions (don't, can't, it's)
- Colloquialisms (kids, a lot of, stuff)
- Casual phrasing (pretty good, really important)
- Vague quantifiers (many, some, lots of)

Provide location + correction for each

**Tone Shift Detection:**
Are there paragraphs where tone suddenly changes? Flag these.

═══════════════════════════════════════════════════════════════════════════
5. COHESION QUALITY MATRIX
═══════════════════════════════════════════════════════════════════════════

**A. Pronoun Reference Clarity:**
For pronouns like "this", "that", "it", "they", "these":
- Location in essay
- Clarity: Clear / Ambiguous
- What does it refer to? (if clear)
- Possible referents (if ambiguous)
- Suggested fix (if ambiguous)

**B. Cohesive Device Analysis:**
- Overall variety score (0-100%)
- Devices used (list)
- Devices overused (if any used 3+ times)
- Device categories underused (comparison, contrast, exemplification, causal)

**C. Topic Sentence Effectiveness:**
For each body paragraph:
- The topic sentence text
- Effectiveness rating (1-5 stars)
- Note on why effective/ineffective
- Suggestion for improvement (if needed)

═══════════════════════════════════════════════════════════════════════════
6. PARAGRAPH UNITY ANALYSIS
═══════════════════════════════════════════════════════════════════════════

For each body paragraph:
- Unity score (0-100%): Does it maintain single focus?
- Main idea of the paragraph
- Off-topic drift detected? (Yes/No)
- Drift details (which sentence strays from main idea)
- Recommendation for improvement

═══════════════════════════════════════════════════════════════════════════

Return ONLY valid JSON matching this exact structure:

{{
  "paragraph_flow_analysis": [
    {{
      "from": "Body Paragraph 2",
      "to": "Body Paragraph 3",
      "flow_strength": 25,
      "quality": "Abrupt",
      "reason": "Topic shifts dramatically from education benefits to environmental pollution without explanation",
      "transition_device_present": false,
      "transition_text": null,
      "logical_gap": "Missing connection between education and environment.",
      "suggestion": "Add transitional sentence: 'Beyond educational considerations, the environmental impact warrants examination.'"
    }}
  ],
  "sentence_flow_analysis": [
    {{
      "paragraph": "Body Paragraph 1",
      "paragraph_number": 2,
      "overall_internal_flow": 75,
      "sentence_transitions": [
        {{
          "from_sentence": "S2",
          "to_sentence": "S3",
          "flow_strength": 40,
          "quality": "Weak",
          "reason": "Abrupt shift from general claim to specific example without bridging phrase",
          "cohesive_link_present": false,
          "cohesive_link": null,
          "suggestion": "Add: 'For instance' or 'A clear example of this is'"
        }}
      ],
      "internal_flow_summary": "Generally smooth with one weak transition between S2-S3 where example introduction needs connector"
    }}
  ],
  "logical_fallacies": [
    {{
      "type": "False Dichotomy",
      "location": "Body Paragraph 2, Sentence 3",
      "problematic_text": "Either we ban smartphones completely in schools, or students will inevitably fail their exams",
      "explanation": "Presents only two extreme options when many moderate approaches exist",
      "impact": "Weakens argument by oversimplifying the issue",
      "suggested_revision": "Schools could implement regulated smartphone policies during class time"
    }}
  ],
  "register_consistency": {{
    "overall_score": 72,
    "consistency_rating": "Mostly consistent with notable lapses",
    "paragraph_scores": [
      {{
        "paragraph": "Body Paragraph 2",
        "formality_percentage": 40,
        "note": "SIGNIFICANT TONE SHIFT - multiple casual expressions break academic register",
        "issues": ["kids", "can't", "pretty important"]
      }}
    ],
    "informal_hotspots": [
      {{
        "location": "Body Para 2, Sentence 2",
        "informal_text": "kids",
        "issue": "Colloquial term in academic essay",
        "formal_alternative": "children / students"
      }}
    ],
    "tone_shift_warning": "Body Paragraph 2 shows marked departure from academic tone. Maintain consistent formality.",
    "academic_tone_advice": "Avoid contractions, colloquialisms, and vague quantifiers."
  }},
  "cohesion_quality": {{
    "pronoun_reference_analysis": [
      {{
        "pronoun": "This",
        "location": "Body Para 2, Sentence 3",
        "context": "Technology increases access. This leads to better outcomes.",
        "clarity": "Ambiguous",
        "possible_referents": [
          "Technology",
          "Increased access"
        ],
        "issue": "Reader must guess what 'This' refers to",
        "suggested_fix": "This increased access leads to better outcomes",
        "severity": "Medium"
      }}
    ],
    "cohesive_device_variety": 65,
    "variety_rating": "Adequate but could improve",
    "devices_used": [
      "However",
      "Furthermore",
      "For example"
    ],
    "devices_overused": [
      {{
        "device": "Moreover",
        "count": 4,
        "issue": "Used to start 4 consecutive sentences - becomes mechanical",
        "suggestion": "Vary with: Additionally, Also, Furthermore"
      }}
    ],
    "devices_underused": [
      "Contrast markers (despite, whereas, although)"
    ],
    "variety_improvement_tip": "You rely heavily on additive connectors. Add contrast and causal markers.",
    "topic_sentences": [
      {{
        "paragraph": "Body Paragraph 2",
        "paragraph_number": 3,
        "sentence": "Another thing to consider is the issue of screen time",
        "effectiveness_rating": 2,
        "effectiveness_note": "Weak - vague and doesn't state the actual argument",
        "strengths": [],
        "weaknesses": ["Vague opener"],
        "suggestion": "Replace with: 'However, excessive screen time poses significant health risks'"
      }}
    ]
  }},
  "paragraph_unity": [
    {{
      "paragraph": "Body Paragraph 2",
      "paragraph_number": 3,
      "unity_score": 65,
      "unity_rating": "Adequate but with drift",
      "main_idea": "Screen time concerns related to technology use",
      "drift_detected": true,
      "drift_details": "Sentence 5 introduces cost of devices. Breaks paragraph unity.",
      "drift_sentence": "Sentence 5: 'Additionally, the cost of technology creates barriers.'",
      "recommendation": "Remove cost discussion from this paragraph OR create separate paragraph on economic barriers."
    }}
  ],
  "overall_flow_score": 68,
  "flow_summary": "Essay shows adequate coherence. Main weaknesses: Abrupt paragraph transition and overuse of 'Moreover'."
}}

REMEMBER: Return ONLY the JSON object, nothing else.
"""

        raw = await self._call_ai(
            system_prompt, user_prompt,
            task_name="FlowLogicAnalysis",
            model=FLOW_LOGIC_MODEL,
            json_mode=True,
        )

        result = self._clean_json(raw)
        logger.info(f"  → Flow & logic analysis complete: "
                    f"{len(result.get('paragraph_flow_analysis', []))} paragraph transitions, "
                    f"{len(result.get('sentence_flow_analysis', []))} paragraphs analyzed for internal flow, "
                    f"overall flow score {result.get('overall_flow_score', 'N/A')}")
        return result

    # ------------------------------------------------------------------
    # SPLIT HELPERS — latency optimisation (v6.0)
    # ------------------------------------------------------------------

    async def _perform_scoring_for_criteria_subset(
        self,
        user_answer: str,
        essay_prompt: str,
        criteria_subset: List[str],
        model: str = SCORING_MODEL_A,
    ) -> dict:
        system_prompt = f"""You are a senior IELTS examiner with 20+ years of experience.
You are scoring with {model}.

Provide detailed band scores (0.5 increments from 1.0 to 9.0) for:
1. Each MAIN criterion (listed below)
2. Each SUB-CATEGORY within each criterion

Be SPECIFIC and DETAILED. Provide concrete evidence and quotes from the essay.
Your scores must REFLECT THE ACTUAL QUALITY of the essay — do not default to the middle.

OFFICIAL IELTS BAND CALIBRATION (use these as concrete anchors):

TASK RESPONSE
  Band 9 : Fully addresses all parts; clear, consistent, fully developed position with precise support
  Band 8 : Sufficiently addresses all parts; well-developed position; minor gaps in development
  Band 7 : Addresses all parts; clear position; main ideas developed but some under-explained
  Band 6 : Addresses task but some parts inadequately covered; position clear but not always consistent
  Band 5 : Partially addresses task; position is present but limited/repetitive development
  Band 4 : Only minimally addresses task; position unclear; little development

COHERENCE & COHESION
  Band 9 : Seamless flow; cohesion invisible; perfect paragraphing; all referencing unambiguous
  Band 8 : Well-organised; cohesion rarely faulty; paragraphing effective; referencing mostly clear
  Band 7 : Clear progression; uses a range of cohesive devices; occasional over/under-use; paragraphing logical
  Band 6 : Arranges info coherently but mechanical use of connectives; inadequate paragraphing possible
  Band 5 : Some organisation; over-use of linkers or lack thereof; limited range of cohesive devices
  Band 4 : Limited organisation; connectives wrong or missing; paragraph structure weak

LEXICAL RESOURCE
  Band 9 : Full flexibility; precise collocations; no errors; sophisticated range
  Band 8 : Wide resource; sophisticated items; occasional minor errors in word choice/collocation
  Band 7 : Sufficient range; some less-common vocabulary; aware of style; some errors in word choice
  Band 6 : Adequate range; attempts less-common vocabulary; noticeable errors in word choice/collocation
  Band 5 : Limited range; basic vocabulary; repetition; errors may cause strain for reader
  Band 4 : Very limited range; errors in basic vocabulary; meaning sometimes obscured

GRAMMATICAL RANGE & ACCURACY
  Band 9 : Full range; rare errors; wide range of complex structures used naturally
  Band 8 : Wide range; majority error-free; occasional slips in complex structures
  Band 7 : Variety of structures; some complex forms; errors occur but rarely affect communication
  Band 6 : Mix of simple and complex; errors in complex structures; errors do not impede communication
  Band 5 : Limited range; frequent grammatical errors; may cause difficulty for reader
  Band 4 : Very limited range; errors dominate; communication frequently impeded

IMPORTANT: A Band 4–5 essay and a Band 8–9 essay must receive substantially different scores.
Do NOT converge toward 6.0–7.0 unless the essay genuinely falls in that range.
Score what you actually read, not what you expect the average essay to look like."""

        _criteria_desc: Dict[str, str] = {
            "Task Response": """**TASK RESPONSE** – assess these 5 sub-categories:
  • Coverage: Does the essay address all parts of the task?
  • Position: Is the writer's opinion clear and consistent throughout?
  • Development: Are ideas fully developed with explanations and examples?
  • Relevance: Is all content directly relevant to the prompt?
  • Conclusion: Is there an appropriate conclusion that summarises the position?""",
            "Coherence & Cohesion": """**COHERENCE & COHESION** – assess these 5 sub-categories:
  • Structure: Is the essay properly organised (intro, body, conclusion)?
  • Paragraphing: Are paragraphs unified, well-structured, with clear topic sentences?
  • Progression: Do ideas flow logically from sentence to sentence and paragraph to paragraph?
  • Cohesive Devices: Are linking words used appropriately (neither over- nor under-used)?
  • Referencing: Are pronouns and references clear and unambiguous?""",
            "Lexical Resource": """**LEXICAL RESOURCE** – assess these 4 sub-categories:
  • Range: Is there sufficient variety of vocabulary across the essay?
  • Word Choice: Are words precise, appropriate, and used in their correct sense?
  • Register: Is the tone consistently formal and academic?
  • Spelling: Are all words spelled correctly?""",
            "Grammatical Range & Accuracy": """**GRAMMATICAL RANGE & ACCURACY** – assess these 5 sub-categories:
  • Range: Is there adequate variety of sentence structures and grammatical forms?
  • Accuracy: Are all grammatical structures used correctly and consistently?
  • Punctuation: Is punctuation (commas, full stops, capitals) used correctly?
  • Complexity: Are complex grammatical structures attempted and successfully controlled?
  • Consistency: Are grammatical forms used consistently (parallelism, tense, number)?""",
        }

        _criteria_schema: Dict[str, str] = {
            "Task Response": (
                '  "Task Response": {{\n'
                '    "overall_score": 0.0,\n'
                '    "overall_justification": "...",\n'
                '    "sub_categories": {{\n'
                '      "Coverage":    {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Position":    {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Development": {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Relevance":   {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Conclusion":  {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}}\n'
                '    }}\n'
                '  }}'
            ),
            "Coherence & Cohesion": (
                '  "Coherence & Cohesion": {{\n'
                '    "overall_score": 0.0,\n'
                '    "overall_justification": "...",\n'
                '    "sub_categories": {{\n'
                '      "Structure":        {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Paragraphing":     {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Progression":      {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Cohesive Devices": {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Referencing":      {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}}\n'
                '    }}\n'
                '  }}'
            ),
            "Lexical Resource": (
                '  "Lexical Resource": {{\n'
                '    "overall_score": 0.0,\n'
                '    "overall_justification": "...",\n'
                '    "sub_categories": {{\n'
                '      "Range":      {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Word Choice":{{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Register":   {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Spelling":   {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}}\n'
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
ESSAY PROMPT: {essay_prompt}

USER ANSWER:
{user_answer}

Provide a holistic assessment. For each criterion and sub-category below,
give: score, strengths, weaknesses, and evidence (specific quotes from the essay).

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

    async def _analyze_argumentation_structural(
        self, user_answer: str, essay_prompt: str
    ) -> dict:
        """
        Parallel split 1/2 of _analyze_argument_structure.
        Covers sections 1 (introduction), 2 (argument map), 3 (conclusion).
        Returns keys: introduction_analysis, argument_map, conclusion_analysis.
        """
        system_prompt = """You are an IELTS argumentation expert analyzing essay structure and critical thinking.

Your task: Assess the structural architecture of the essay — introduction, argument mapping, and conclusion.

CRITICAL: You are NOT detecting grammar/vocabulary errors. Focus ONLY on:
1. Introduction structure (position stated? thesis clear? preview?)
2. Argument structure mapping (claim → evidence → explanation chains)
3. Conclusion quality (summarizes? restates position? new ideas?)

For IELTS Task 2 essays, strong arguments have:
- Clear introduction with position statement and thesis
- Main claim stated in topic sentence
- Concrete evidence (specific examples, data, research)
- Explanation of HOW/WHY the evidence supports the claim
- Nuanced language (qualified statements, not absolutes)
- Proper conclusion that summarizes without introducing new ideas"""

        user_prompt = f"""
ESSAY PROMPT: {essay_prompt}

USER ESSAY:
{user_answer}

Analyze the structural elements of this essay:

═══════════════════════════════════════════════════════════════════════════
1. INTRODUCTION STRUCTURE ANALYSIS
═══════════════════════════════════════════════════════════════════════════

Analyze the introduction paragraph:

**Position Statement:**
- Is the writer's position clearly stated? (Clear / Vague / Missing)
- Where is it located? (First sentence / Middle / End / Not found)
- Quote the position statement if present

**Thesis Statement:**
- Is there a clear thesis that previews the main arguments? (Yes / Partial / No)
- Does it forecast the essay structure?
- Quote the thesis if present

**Hook/Background:**
- Does intro provide context/background? (Yes / No)
- Is the hook engaging or generic?

**Overall Introduction Quality:** Rate 1-5 stars
**Recommendation:** How to improve the introduction

═══════════════════════════════════════════════════════════════════════════
2. ARGUMENT STRUCTURE MAP
═══════════════════════════════════════════════════════════════════════════

For EACH main argument (typically 2-3 body paragraphs), identify:

**Main Claim:** What is the central argument of this paragraph?

**Evidence Quality Rating (1-5 stars):**
★☆☆☆☆ = No evidence provided, just assertion
★★☆☆☆ = Vague example ("technology helps students")
★★★☆☆ = Concrete example but limited detail
★★★★☆ = Multiple specific examples or relevant data
★★★★★ = Research-backed, specific statistics/studies cited

**Explanation Depth:**
- Surface: Claim stated but no explanation of mechanism
- Developing: Some explanation but incomplete reasoning
- Sophisticated: Full causal chain explained (X leads to Y because Z)

**Missing Elements:** What would make this argument stronger?

**Overall Strength Score:** Rate 1.0-9.0 (IELTS band equivalent)

**Actionable Recommendation:** Specific improvement suggestion

═══════════════════════════════════════════════════════════════════════════
3. CONCLUSION QUALITY ANALYSIS
═══════════════════════════════════════════════════════════════════════════

Analyze the conclusion paragraph:

**Summarizes Main Points:** Does it recap the key arguments? (Yes / Partial / No)
**Restates Position:** Is the writer's position clearly restated? (Yes / Vague / No)
**Introduces New Ideas:** Does it introduce NEW arguments not discussed in body? (Yes / No)
- If yes, list the new ideas introduced (this is a mistake)
**Closure Quality:** Does it provide proper closure? (Strong / Adequate / Weak)
**Overall Conclusion Quality:** Rate 1-5 stars
**Recommendation:** How to improve the conclusion

═══════════════════════════════════════════════════════════════════════════

Return ONLY valid JSON matching this exact structure:

{{
  "introduction_analysis": {{
    "position_statement_clarity": "Clear",
    "position_location": "First sentence",
    "position_quote": "...",
    "thesis_present": "Yes",
    "thesis_forecasts_structure": true,
    "thesis_quote": "...",
    "provides_background": true,
    "hook_quality": "Generic",
    "overall_quality_stars": 4,
    "strengths": ["Clear position stated"],
    "weaknesses": ["Generic hook"],
    "recommendation": "..."
  }},
  "argument_map": [
    {{
      "paragraph": "Body Paragraph 1",
      "main_claim": "...",
      "evidence_quality_stars": 3,
      "evidence_quality_text": "...",
      "explanation_depth": "Developing",
      "explanation_note": "...",
      "missing_elements": ["Specific example (e.g., Khan Academy usage statistics)"],
      "strength_score": 6.0,
      "recommendation": "..."
    }}
  ],
  "conclusion_analysis": {{
    "summarizes_main_points": "Partial",
    "summarizes_note": "...",
    "restates_position": "Yes",
    "position_quote": "...",
    "introduces_new_ideas": true,
    "new_ideas_introduced": ["Government funding (not discussed in body paragraphs)"],
    "closure_quality": "Weak",
    "overall_quality_stars": 2,
    "strengths": ["Position restated"],
    "weaknesses": ["Incomplete summary"],
    "recommendation": "..."
  }}
}}

REMEMBER: Return ONLY the JSON object, nothing else.
"""
        raw = await self._call_ai(
            system_prompt, user_prompt,
            task_name="ArgumentationStructural",
            model=ARGUMENTATION_MODEL,
            json_mode=True,
        )
        result = self._clean_json(raw)
        logger.info(f"  → Argumentation structural complete: "
                    f"{len(result.get('argument_map', []))} arguments mapped, "
                    f"Intro {result.get('introduction_analysis', {}).get('overall_quality_stars', 'N/A')}★, "
                    f"Conclusion {result.get('conclusion_analysis', {}).get('overall_quality_stars', 'N/A')}★")
        return result

    async def _analyze_argumentation_analytical(
        self, user_answer: str, essay_prompt: str
    ) -> dict:
        """
        Parallel split 2/2 of _analyze_argument_structure.
        Covers sections 4 (critical thinking), 5 (task alignment), 6 (authenticity) + overall_summary.
        Returns keys: critical_thinking, task_alignment, authenticity, overall_summary.
        """
        system_prompt = """You are an IELTS argumentation expert analyzing critical thinking and task alignment.

Your task: Assess the analytical depth and authenticity of the essay arguments.

CRITICAL: You are NOT detecting grammar/vocabulary errors. Focus ONLY on:
1. Critical thinking depth (surface vs sophisticated analysis)
2. Task alignment verification (did student answer the right question?)
3. Authenticity check (memorized phrases, over-generalizations, mother tongue interference)

For IELTS Task 2 essays, strong analytical writing has:
- Nuanced language (qualified statements, not absolutes)
- Counterarguments acknowledged
- Causal reasoning (HOW/WHY, not just WHAT)
- Correct interpretation of task type
- Authentic, non-templated expression"""

        user_prompt = f"""
ESSAY PROMPT: {essay_prompt}

USER ESSAY:
{user_answer}

Conduct a deep analytical and authenticity assessment:

═══════════════════════════════════════════════════════════════════════════
4. CRITICAL THINKING ANALYSIS
═══════════════════════════════════════════════════════════════════════════

**Sophistication Band:** Overall critical thinking level (1.0-9.0)
**Sophistication Level:** Surface-level / Developing / Sophisticated

**Metrics:**
- Unsupported claims count (statements with no backing)
- Nuanced arguments count (qualified, balanced statements)
- Counterargument status (Missing / Weak / Present / Strong)
- Causal reasoning quality (Weak / Adequate / Strong)

**Evidence:**
Provide 1-2 examples showing:
- Surface claim → What sophisticated version would look like
- Weak reasoning → How to strengthen it

═══════════════════════════════════════════════════════════════════════════
5. TASK ALIGNMENT CHECK
═══════════════════════════════════════════════════════════════════════════

**Prompt Analysis:**
What type of task is this?
- Discuss both views and give opinion
- Agree or disagree
- Advantages and disadvantages
- Causes and solutions
- Two-part question

**Student's Interpretation:**
Did the student correctly understand the task type?

**Required Elements Checklist:**
For "Discuss both views":
  - View A discussed? (Complete / Incomplete / Missing)
  - View B discussed? (Complete / Incomplete / Missing)
  - Opinion stated? (Clear / Vague / Missing)
  - Opinion justified? (Yes / No)

**Coverage Balance:**
For balanced tasks, estimate percentages:
Expected: View A 40% + View B 40% + Opinion 20%
Actual: View A ___% + View B ___% + Opinion ___%

**Misinterpretation Warning:**
If task was misunderstood, explain the error clearly

═══════════════════════════════════════════════════════════════════════════
6. AUTHENTICITY & PITFALL DETECTION (ENHANCED)
═══════════════════════════════════════════════════════════════════════════

For each category below, you MUST follow this two-step process:
  STEP 1 — Find it: Locate the EXACT phrase in the essay and quote it verbatim.
  STEP 2 — Fix it: Write a concrete replacement (never leave the fix field empty).
  SKIP any item where you cannot complete BOTH steps.

**Memorized IELTS Phrases** (max 5):
Common examples: "In this modern era", "Last but not least", "It goes without saying",
"On the one hand / on the other hand", "In conclusion", "In my opinion",
"There are both advantages and disadvantages", "To conclude"
  STEP 1 → "phrase": copy the exact words from the essay
  STEP 2 → "suggestion": write a specific, authentic replacement sentence or phrase
  If you can only do one step, OMIT the item.

**Over-generalizations**:
Absolute statements without qualification ("Everyone knows", "All people", "It is always")
  STEP 1 → "phrase": copy the exact words from the essay
  STEP 2 → "suggestion": write a SHORT replacement PHRASE only (3-8 words max).
  The replacement must be a drop-in swap for the cliché — NOT a full sentence.
  Good: "presents significant challenges" | Bad: "Overall, the rapid pace of change poses risks"
  If you can only do one step, OMIT the item.

**Mother Tongue Interference**:
Non-native sentence patterns, wrong prepositions, direct translations, article errors
  STEP 1 → "phrase": copy the EXACT problematic phrase as the student WROTE it
  STEP 2 → "suggestion": write the corrected native-English version
  If you can only do one step, OMIT the item.

**Clichés & Overused IELTS Expressions**:
Examples: "a double-edged sword", "play a pivotal role", "the pros and cons"
  STEP 1 → "phrase": copy the exact cliché from the essay
  STEP 2 → "suggestion": write a fresh, specific alternative
  If you can only do one step, OMIT the item.

**Formulaic vs Natural Ratio:**
Estimate % of essay that sounds templated vs authentic (0-100%). Target for Band 8+: 80%+ natural.

═══════════════════════════════════════════════════════════════════════════

PRE-OUTPUT VALIDATION — before returning JSON, check every item:
  ✓ memorized_phrases:          "phrase" non-empty AND "suggestion" non-empty
  ✓ over_generalizations:       "phrase" non-empty AND "suggestion" non-empty
  ✓ mother_tongue_interference: "phrase" non-empty AND "suggestion" non-empty
  ✓ cliches_detected:           "phrase" non-empty AND "suggestion" non-empty
  Remove any item that fails either check. Never output a pair where one field is empty, null, or "...".

Return ONLY valid JSON matching this exact structure.
All example values below are fully populated — follow this pattern exactly:

{{
  "critical_thinking": {{
    "sophistication_band": 6.5,
    "sophistication_level": "Developing",
    "unsupported_claims_count": 3,
    "unsupported_claims_examples": ["Technology makes students smarter (no evidence provided)"],
    "nuanced_arguments_count": 1,
    "nuanced_example": "While technology offers accessibility benefits, over-reliance may reduce face-to-face social skills",
    "counterargument_status": "Missing",
    "counterargument_note": "Essay only presents benefits without addressing opposing viewpoints",
    "causal_reasoning": "Adequate",
    "causal_reasoning_note": "Some cause-effect relationships mentioned but mechanisms not fully explained",
    "depth_comparison": {{
      "surface_example": "Technology is useful for education",
      "improved_example": "Technology enhances educational outcomes by providing personalised learning paths, as demonstrated by adaptive platforms like Khan Academy, which adjusts difficulty based on individual student performance"
    }}
  }},
  "task_alignment": {{
    "prompt_type_identified": "Discuss both views and give your opinion",
    "prompt_type_student_treated_as": "Advantages and disadvantages",
    "correctly_interpreted": false,
    "required_elements": [
      {{
        "element": "Discuss View A (technology benefits education)",
        "status": "Complete",
        "coverage_percentage": 65,
        "note": "Well-developed with multiple examples"
      }}
    ],
    "balance_score": 3.5,
    "balance_explanation": "Heavily skewed toward one view (65-15-10 split instead of expected 40-40-20)",
    "misinterpretation_warning": "The prompt asks you to discuss BOTH views equally before giving your opinion.",
    "task_type_guide": "For 'Discuss both views' tasks: Para 1 intro, Para 2 View A, Para 3 View B, Para 4 opinion, Para 5 conclusion"
  }},
  "authenticity": {{
    "memorized_phrases": [
      {{
        "phrase": "On the one hand",
        "location": "Body Paragraph 1, Sentence 1",
        "issue": "Formulaic IELTS template phrase that signals memorised structure",
        "suggestion": "One significant advantage is that"
      }}
    ],
    "over_generalizations": [
      {{
        "phrase": "Everyone knows that technology is beneficial",
        "location": "Body Paragraph 1, Sentence 2",
        "issue": "Absolute universal claim with no evidence or qualification",
        "suggestion": "Research increasingly suggests that technology, when used appropriately, can benefit learners"
      }}
    ],
    "mother_tongue_interference": [
      {{
        "pattern": "Missing definite article before institution noun",
        "location": "Body Paragraph 2, Sentence 3",
        "phrase": "government should invest more",
        "suggestion": "the government should invest more",
        "explanation": "English requires 'the' before a specific institution when referring to a particular body"
      }}
    ],
    "cliches_detected": [
      {{
        "phrase": "a double-edged sword",
        "location": "Introduction, Sentence 3",
        "issue": "Overused IELTS cliché that examiners see in nearly every essay",
        "suggestion": "presents both significant opportunities and serious challenges"
      }}
    ],
    "formulaic_vs_natural_percentage": 45,
    "authenticity_score": 55,
    "authenticity_note": "45% of essay uses memorised IELTS templates. For Band 8+, aim for 80%+ natural, authentic academic expression."
  }},
  "overall_summary": "Essay demonstrates developing argumentation skills with clear structure but significant gaps..."
}}

REMEMBER: Return ONLY the JSON object, nothing else.
"""
        raw = await self._call_ai(
            system_prompt, user_prompt,
            task_name="ArgumentationAnalytical",
            model=ARGUMENTATION_MODEL,
            json_mode=True,
        )
        result = self._clean_json(raw)
        logger.info(f"  → Argumentation analytical complete: "
                    f"CT band {result.get('critical_thinking', {}).get('sophistication_band', 'N/A')}, "
                    f"task correctly interpreted: {result.get('task_alignment', {}).get('correctly_interpreted', 'N/A')}, "
                    f"authenticity score: {result.get('authenticity', {}).get('authenticity_score', 'N/A')}")
        return result

    async def _analyze_flow_macro(
        self, user_answer: str, essay_prompt: str
    ) -> dict:
        """
        Parallel split 1/2 of _analyze_flow_and_logic.
        Covers: paragraph_flow_analysis, logical_fallacies, cohesion_quality,
                paragraph_unity, overall_flow_score, flow_summary.
        """
        system_prompt = """You are an IELTS coherence expert analyzing essay flow and logical connections.

Your task: Assess logical progression and structural coherence at the paragraph level.

CRITICAL: You are NOT detecting individual cohesive device errors. Focus ONLY on:
1. Paragraph-to-paragraph flow strength (transition quality between paragraphs)
2. Logical coherence (reasoning gaps, fallacies)
3. Cohesion patterns (pronoun clarity, device variety, topic sentence effectiveness)
4. Paragraph unity (single focus maintenance)

Strong coherence features:
- Smooth transitions between paragraphs
- Consistent academic register throughout
- Clear pronoun references
- Varied cohesive devices (not mechanical repetition)
- Strong topic sentences that forecast paragraph content

Weak coherence features:
- Abrupt paragraph shifts
- Ambiguous pronouns ("this" without clear referent)
- Overuse of same connectors
- Vague topic sentences
- Disjointed paragraphs"""

        user_prompt = f"""
ESSAY PROMPT: {essay_prompt}

USER ESSAY:
{user_answer}

Conduct a macro-level flow and logic analysis:

═══════════════════════════════════════════════════════════════════════════
1. PARAGRAPH-TO-PARAGRAPH FLOW ANALYSIS
═══════════════════════════════════════════════════════════════════════════

For EACH transition (Intro→Para1, Para1→Para2, Para2→Para3, Para3→Conclusion):

**Flow Strength:** 0-100% (how smoothly does one paragraph connect to the next?)
0-30%: Abrupt, jarring shift
30-60%: Weak connection
60-80%: Adequate transition
80-100%: Smooth, natural flow

**Quality:** Smooth / Adequate / Weak / Abrupt

**Reason:** WHY is it smooth or abrupt? What makes the connection work/fail?

**Logical Gap (if present):** What missing link would improve the connection?

**Transition Device Present:** Yes/No - is there a connector (However, Furthermore, etc.)?

**Suggestion:** If weak, how to improve?

═══════════════════════════════════════════════════════════════════════════
3. LOGICAL COHERENCE & FALLACY DETECTION
═══════════════════════════════════════════════════════════════════════════

Identify any logical fallacies or reasoning errors:

**Common IELTS Fallacies:**
- False Dichotomy: Presenting only 2 options when more exist
- Hasty Generalization: Single example → universal conclusion
- Non Sequitur: Conclusion doesn't logically follow from premise
- Circular Reasoning: Conclusion restates premise
- Appeal to Emotion: Relies on feelings rather than logic
- Slippery Slope: X will inevitably lead to Z without evidence
- Ad Hominem: Attacking person instead of argument

For each fallacy found:
- Type, location, exact problematic text, explanation, impact, suggested revision

═══════════════════════════════════════════════════════════════════════════
5. COHESION QUALITY MATRIX
═══════════════════════════════════════════════════════════════════════════

**A. Pronoun Reference Clarity:**
For pronouns like "this", "that", "it", "they", "these":
- Location, clarity (Clear / Ambiguous), referent or possible referents, suggested fix

**B. Cohesive Device Analysis:**
- Overall variety score (0-100%)
- Devices used (list)
- Devices overused (if any used 3+ times)
- Device categories underused (comparison, contrast, exemplification, causal)

**C. Topic Sentence Effectiveness:**
For each body paragraph:
- The topic sentence text, effectiveness rating (1-5 stars), note, suggestion

═══════════════════════════════════════════════════════════════════════════
6. PARAGRAPH UNITY ANALYSIS
═══════════════════════════════════════════════════════════════════════════

For each body paragraph:
- Unity score (0-100%): Does it maintain single focus?
- Main idea of the paragraph
- Off-topic drift detected? (Yes/No)
- Drift details (which sentence strays from main idea)
- Recommendation for improvement

═══════════════════════════════════════════════════════════════════════════

Return ONLY valid JSON matching this exact structure:

{{
  "paragraph_flow_analysis": [
    {{
      "from": "Introduction",
      "to": "Body Paragraph 1",
      "flow_strength": 85,
      "quality": "Smooth",
      "reason": "...",
      "transition_device_present": true,
      "transition_text": "Firstly",
      "logical_gap": null,
      "suggestion": null
    }}
  ],
  "logical_fallacies": [
    {{
      "type": "False Dichotomy",
      "location": "Body Paragraph 2, Sentence 3",
      "problematic_text": "...",
      "explanation": "...",
      "impact": "...",
      "suggested_revision": "..."
    }}
  ],
  "cohesion_quality": {{
    "pronoun_reference_analysis": [
      {{
        "pronoun": "This",
        "location": "...",
        "context": "...",
        "clarity": "Ambiguous",
        "possible_referents": ["..."],
        "issue": "...",
        "suggested_fix": "...",
        "severity": "Medium"
      }}
    ],
    "cohesive_device_variety": 65,
    "variety_rating": "Adequate but could improve",
    "devices_used": ["However", "Therefore", "Furthermore"],
    "devices_overused": [
      {{
        "device": "Moreover",
        "count": 4,
        "issue": "...",
        "suggestion": "..."
      }}
    ],
    "devices_underused": ["Contrast markers"],
    "variety_improvement_tip": "...",
    "topic_sentences": [
      {{
        "paragraph": "Body Paragraph 1",
        "paragraph_number": 2,
        "sentence": "...",
        "effectiveness_rating": 5,
        "effectiveness_note": "...",
        "strengths": ["..."],
        "weaknesses": [],
        "suggestion": null
      }}
    ]
  }},
  "paragraph_unity": [
    {{
      "paragraph": "Body Paragraph 1",
      "paragraph_number": 2,
      "unity_score": 95,
      "unity_rating": "Excellent",
      "main_idea": "...",
      "drift_detected": false,
      "drift_details": null,
      "recommendation": "..."
    }}
  ],
  "overall_flow_score": 68,
  "flow_summary": "..."
}}

REMEMBER: Return ONLY the JSON object, nothing else.
"""
        raw = await self._call_ai(
            system_prompt, user_prompt,
            task_name="FlowMacro",
            model=FLOW_LOGIC_MODEL,
            json_mode=True,
        )
        result = self._clean_json(raw)
        logger.info(f"  → Flow macro complete: "
                    f"{len(result.get('paragraph_flow_analysis', []))} paragraph transitions, "
                    f"overall flow score {result.get('overall_flow_score', 'N/A')}")
        return result

    async def _analyze_flow_sentence(
        self, user_answer: str, essay_prompt: str
    ) -> dict:
        """
        Parallel split 2/3 of flow analysis.
        Covers: sentence_flow_analysis ONLY.
        Smooth transitions output compact form; only Weak/Abrupt get full detail.
        """
        system_prompt = """You are an IELTS coherence expert analyzing sentence-level flow within paragraphs.

Your task: Assess internal sentence-to-sentence transitions in each body paragraph.

OUTPUT EFFICIENCY RULE (strictly follow to keep response concise):
- For transitions with quality "Smooth" (flow_strength >= 70): output ONLY flow_strength and quality.
- For transitions with quality "Adequate", "Weak", or "Abrupt" (flow_strength < 70): output the full object including reason, cohesive_link_present, cohesive_link, and suggestion.
This rule is mandatory. Do not add extra fields to smooth transitions."""

        user_prompt = f"""
ESSAY PROMPT: {essay_prompt}

USER ESSAY:
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
      "overall_internal_flow": 75,
      "sentence_transitions": [
        {{
          "from_sentence": "S2",
          "to_sentence": "S3",
          "flow_strength": 40,
          "quality": "Weak",
          "reason": "Abrupt shift from general claim to specific example without bridging phrase",
          "cohesive_link_present": false,
          "cohesive_link": null,
          "suggestion": "Add: 'For instance' or 'A clear example of this is'"
        }}
      ],
      "internal_flow_summary": "Generally smooth with one weak S2→S3 transition needing a bridging phrase"
    }}
  ]
}}

REMEMBER: Return ONLY the JSON object, nothing else.
"""
        raw = await self._call_ai(
            system_prompt, user_prompt,
            task_name="FlowSentence",
            model=FLOW_LOGIC_MODEL,
            json_mode=True,
        )
        result = self._clean_json(raw)
        logger.info(f"  → Flow sentence complete: "
                    f"{len(result.get('sentence_flow_analysis', []))} paragraphs analyzed for internal flow")
        return result

    async def _analyze_flow_register(
        self, user_answer: str, essay_prompt: str
    ) -> dict:
        """
        Parallel split 3/3 of flow analysis.
        Covers: register_consistency ONLY.
        """
        system_prompt = """You are an IELTS register and tone expert.

Your task: Assess academic register consistency across the essay.

Focus ONLY on:
- Per-paragraph formality scores
- Informal language hotspots (exact quote + formal replacement)
- Tone shift detection

CRITICAL RULE for informal_hotspots: Every item MUST have BOTH:
  "informal_text" → the EXACT informal word/phrase from the essay (verbatim)
  "formal_alternative" → a concrete formal replacement
Omit any item where you cannot provide both fields."""

        user_prompt = f"""
ESSAY PROMPT: {essay_prompt}

USER ESSAY:
{user_answer}

Assess register and tone consistency:

**Per-Paragraph Formality Scores:**
Rate each paragraph 0-100%.
BREVITY RULE: "note" field: max 10 words per paragraph.

**Informal Language Hotspots:**
For each informal instance provide BOTH:
- "informal_text": EXACT word/phrase from the essay (verbatim — never empty)
- "formal_alternative": concrete formal replacement (never empty)
Skip any item where you cannot provide both fields.
BREVITY RULE: "issue" field: max 10 words.

**Tone Shift Detection:**
One sentence max flagging any paragraph where tone shifts.

Return ONLY valid JSON:

{{
  "register_consistency": {{
    "overall_score": 85,
    "consistency_rating": "Mostly consistent with minor lapses",
    "paragraph_scores": [
      {{
        "paragraph": "Body Paragraph 2",
        "formality_percentage": 60,
        "note": "Two informal expressions detected",
        "issues": ["can't", "a lot of problems"]
      }}
    ],
    "informal_hotspots": [
      {{
        "location": "Body Para 2, Sentence 3",
        "informal_text": "can't afford",
        "issue": "Contraction in academic writing",
        "formal_alternative": "cannot afford"
      }}
    ],
    "tone_shift_warning": "Body Paragraph 2 drops to 60% formality. Maintain academic register throughout.",
    "academic_tone_advice": "Replace contractions and vague quantifiers with precise formal vocabulary."
  }}
}}

REMEMBER: Return ONLY the JSON object, nothing else.
"""
        raw = await self._call_ai(
            system_prompt, user_prompt,
            task_name="FlowRegister",
            model=FLOW_LOGIC_MODEL,
            max_tokens=400,
            json_mode=True,
        )
        result = self._clean_json(raw)
        logger.info(f"  → Flow register complete: "
                    f"register score {result.get('register_consistency', {}).get('overall_score', 'N/A')}")
        return result

    # ------------------------------------------------------------------
    # CHANGE 4: FLOW DATA CLEANER
    # ------------------------------------------------------------------
    def _clean_authenticity_data(self, argumentation_data: dict) -> dict:
        """
        Remove authenticity sub-items where either the source phrase OR the
        suggested fix is absent. This prevents empty bullet points in the UI.
        """
        import copy
        data = copy.deepcopy(argumentation_data)
        auth = data.get("authenticity", {})
        if not isinstance(auth, dict):
            return data

        def _both_nonempty(item: dict, key1: str, key2: str) -> bool:
            return bool((item.get(key1) or "").strip()) and bool((item.get(key2) or "").strip())

        # Memorized phrases: need phrase + suggestion
        auth["memorized_phrases"] = [
            i for i in (auth.get("memorized_phrases") or [])
            if _both_nonempty(i, "phrase", "suggestion")
        ]

        # Over-generalizations: need phrase + suggestion
        auth["over_generalizations"] = [
            i for i in (auth.get("over_generalizations") or [])
            if _both_nonempty(i, "phrase", "suggestion")
        ]

        # Mother tongue interference: need phrase + suggestion
        auth["mother_tongue_interference"] = [
            i for i in (auth.get("mother_tongue_interference") or [])
            if _both_nonempty(i, "phrase", "suggestion")
        ]

        # Clichés: need phrase + suggestion
        auth["cliches_detected"] = [
            i for i in (auth.get("cliches_detected") or [])
            if _both_nonempty(i, "phrase", "suggestion")
        ]

        data["authenticity"] = auth
        return data

    def _clean_flow_data(self, flow_data: dict) -> dict:
        """
        Post-process flow_logic_analysis to filter out any entries missing
        required display fields. If either the source-text field OR the
        fix/suggestion field is absent/empty for a given item, that item
        is removed before the result is sent to the UI.
        """
        import copy
        data = copy.deepcopy(flow_data)

        def _has_both(item: dict, key1: str, key2: str) -> bool:
            v1 = (item.get(key1) or "").strip()
            v2 = (item.get(key2) or "").strip()
            return bool(v1) and bool(v2)

        reg = data.get("register_consistency", {})
        if isinstance(reg, dict):
            hotspots = reg.get("informal_hotspots", [])
            if isinstance(hotspots, list):
                reg["informal_hotspots"] = [
                    h for h in hotspots
                    if _has_both(h, "informal_text", "formal_alternative")
                ]

        fallacies = data.get("logical_fallacies", [])
        if isinstance(fallacies, list):
            data["logical_fallacies"] = [
                f for f in fallacies
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

    async def _generate_grammar_analysis(
        self, error_data: dict, essay_prompt: str, user_answer: str,
        pre_fetched_ai_result: Optional[str] = None
    ) -> dict:
        """
        Generate grammar analysis from errors (merged local heuristics + AI prompt).

        CHANGE 3: Grammar AI is instructed to provide EXACTLY 3 suggested enrichments.
        """
        grammar_errors = [
            e for e in error_data.get("errors", [])
            if e.get("official_criteria") == "Grammatical Range & Accuracy"
        ]
        errors_by_subcat: Dict[str, List[dict]] = defaultdict(list)
        for err in grammar_errors:
            errors_by_subcat[err.get("sub_category", "Other")].append(err)

        used_structures: List[str] = []
        if not grammar_errors:
            used_structures = [
                "Wide range of grammatical structures",
                "Complex subordinate clauses",
                "Accurate tense usage throughout",
                "Appropriate use of relative clauses",
                "Consistent subject-verb agreement",
            ]
        else:
            if any(e.get("error_id") in ("tense_aspect", "tense") for e in grammar_errors):
                used_structures.append("Various tense forms (simple and continuous)")
            if any(e.get("error_id") == "subject_verb_agreement" for e in grammar_errors):
                used_structures.append("Subject-verb agreement in simple sentences")
            if "Complexity" not in errors_by_subcat:
                used_structures.append("Complex sentences with subordinators (although, because, while)")
                used_structures.append("Nominal forms and multi-clause sentences")
            if not used_structures:
                used_structures = ["Basic sentence structures present"]

        enrichments: List[dict] = []

        if "Accuracy" in errors_by_subcat:
            acc_errors  = errors_by_subcat["Accuracy"]
            error_types = {e.get("error_id") for e in acc_errors}
            if "subject_verb_agreement" in error_types:
                enrichments.append({
                    "structure": "Subject-Verb Agreement in Complex Sentences (e.g., ensure verbs match plural/singular subjects)",
                    "benefit":   "Prevents basic agreement errors which lower accuracy scores and distract the reader.",
                    "example_context": f"Error found: '{acc_errors[0].get('original_text', '')}'. Practice with collective nouns."
                })
            if "article_determiner" in error_types:
                enrichments.append({
                    "structure": "Correct Article Usage (e.g., 'a', 'an', 'the', zero article)",
                    "benefit":   "Shows fine-grained control over noun referencing and is expected at high bands.",
                    "example_context": "Use zero article for general concepts: 'Technology is useful'."
                })

        if "Punctuation" in errors_by_subcat:
            punct_sample = next(
                (e.get("original_text") for e in errors_by_subcat["Punctuation"] if e.get("original_text")),
                None,
            )
            enrichments.append({
                "structure": "Correct Punctuation and Clause Separation (e.g., commas after introductory phrases, avoid comma splice)",
                "benefit":   "Improves readability and prevents mis-parsing of ideas.",
                "example_context": f"Error found: '{punct_sample}'." if punct_sample else
                    "Use a comma after introductory adverbials ('However, ...') and between coordinate clauses."
            })

        advanced_always = [
            {
                "structure": "Complex Sentences with Subordinate Clauses (e.g., using 'although', 'which', or 'because')",
                "benefit":   "Adds formal variety and links ideas logically, boosting cohesion and complexity.",
                "example_context": "Although parents play a crucial role, schools provide structured socialisation that complements family influence."
            },
            {
                "structure": "Conditional Type 2 (e.g., 'If governments invested more, outcomes would improve')",
                "benefit":   "Allows discussion of hypothetical situations and nuanced argumentation.",
                "example_context": "If governments invested more in early education, children would benefit significantly."
            },
            {
                "structure": "Nominalisation (e.g., turning verbs into nouns: 'decide' → 'decision')",
                "benefit":   "Creates a formal academic tone and allows more compact expression of complex ideas.",
                "example_context": "The decision-making of policymakers influences long-term developmental outcomes."
            },
            {
                "structure": "Passive Voice (e.g., 'It has been argued that...')",
                "benefit":   "Helps achieve academic objectivity and vary sentence patterns.",
                "example_context": "It has been argued that parental involvement is the primary determinant of socialisation."
            },
            {
                "structure": "Subjunctive and Modal Perfects (e.g., 'could have been', 'should have been')",
                "benefit":   "Enables precise expression about past possibility, obligation, or counterfactuals.",
                "example_context": "Policymakers should have been more proactive in funding early education programmes."
            },
        ]
        existing_keys = {e["structure"] for e in enrichments}
        for adv in advanced_always:
            if adv["structure"] not in existing_keys:
                enrichments.append(adv)

        total = len(grammar_errors)
        if total == 0:
            summary = "Excellent grammatical control with no errors detected. Continue using a wide range of structures while maintaining full accuracy."
        elif total <= 3:
            summary = f"Good grammatical control with {total} error(s). Primary focus areas: {', '.join(errors_by_subcat.keys())}."
        else:
            summary = f"{total} grammatical errors identified. Key areas requiring review: {', '.join(errors_by_subcat.keys())}."

        tips: List[str] = []
        if "Accuracy" in errors_by_subcat:
            tips.append("Practise subject-verb agreement drills with compound and collective subjects.")
            tips.append("Create reference notes for article rules (zero article vs 'the' vs 'a/an') and apply in short writing drills.")
        if "Punctuation" in errors_by_subcat:
            tips.append("Conduct dedicated punctuation-focused editing passes: check commas, semicolons, and sentence boundaries.")
        if not tips:
            tips = [
                "Vary sentence openings to demonstrate range.",
                "Use a mix of simple, compound, and complex sentence types.",
                "Include advanced structures (passives, conditionals, nominalisations).",
            ]

        local_result = {
            "grammar_analysis": {
                "used_structures":               used_structures,
                "suggested_enrichments":         enrichments,
                "strengths_weaknesses_summary":  summary,
                "expert_tips":                   tips,
            }
        }

        if pre_fetched_ai_result is not None:
            raw_ai = pre_fetched_ai_result
            logger.info("  → Grammar: using pre-fetched AI result (no extra API call).")
        else:
            # CHANGE 3: exactly 3 enrichments
            grammar_system = (
                "You are an expert IELTS Grammar Specialist focusing on Grammatical Range and Accuracy. "
                "Respond only with a valid JSON object."
            )
            grammar_user = f"""
ESSAY PROMPT: {essay_prompt}
USER ANSWER: {user_answer}

TASK: Analyse the grammar in this essay deeply and provide a structured report.

**1. DETECTED STRUCTURES**
List the grammatical structures the student ACTUALLY used in the text. Be specific.

**2. SUGGESTED ENRICHMENTS — EXACTLY 3 ITEMS**
Identify exactly 3 specific grammar structures missing or underutilised that would reach Band 8+.
You MUST provide exactly 3 items — no more, no less.

CRITICAL INSTRUCTIONS FOR ENRICHMENTS:
- "structure": Include a simple example in parentheses for non-technical users.
  e.g. "Complex Sentences with Subordinate Clauses (e.g., using 'although', 'which', or 'because')"
- "benefit": Explain why it helps (e.g., "Adds formal variety and links ideas logically").
- "example_context": Provide a specific example using the ACTUAL content of this essay.

**3. STRENGTHS & WEAKNESSES**
Write a concise summary analysing the grammatical performance.

**4. CRITICAL EXPERT TIPS**
Provide specific, actionable tips to enhance the grammatical quality.

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

            # CHANGE 3: cap AI enrichments at exactly 3
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

    def _build_error_summary(self, all_errors: List[dict]) -> dict:
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

    def _save_comprehensive_report(
        self, result: dict, exam_name: str, prompt: str, user_answer: str
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
                    "prompt":                  prompt,
                    "user_answer":             user_answer,
                    "grading_system_version":  "7.1-VOCAB-SPLIT-JSON-TRIM-GRAMMAR3-FLOWCLEAN",
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
                "argumentation": result.get("argumentation_analysis", {}),
                "flow_logic": result.get("flow_logic_analysis", {}),
            }
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            logger.info(f"Report saved: {filepath}")
            return str(filepath)
        except Exception as e:
            logger.error(f"Failed to save report: {str(e)}")
            return None

    # ------------------------------------------------------------------
    # MAIN GRADING ENTRY POINT (v7.1)
    # ------------------------------------------------------------------

    async def grade_writing_answer(
        self,
        user_answer: str,
        essay_prompt: str,
        exam_name: str = "IELTS Writing Task 2",
    ) -> dict:
        """
        v7.1 – VOCAB SPLIT + JSON ARRAY TRIM + GRAMMAR-3 + FLOW-CLEAN

        Changes from v7.0:
          CHANGE 1: Vocabulary split into 3 parallel batches (10 items each = 30 total)
                    covering Topic-Specific Nouns/Verbs, Academic Adj/Adv/Collocations,
                    Advanced Phrases/Discourse Expressions.
          CHANGE 2: JSON example arrays in Arg & Flow prompts trimmed to 1 item each.
                    No other prompt text changed.
          CHANGE 3: GrammarPrefetch requests EXACTLY 3 suggested enrichments.
                    Merge logic caps at 3 items.
          CHANGE 4: _clean_flow_data() post-processes flow results, removing items
                    missing required phrase/fix display fields.

        Total parallel calls: 20 (was 17 in v7.0).
        """
        try:
            logger.info("=" * 80)
            logger.info("IELTS GRADING v7.1 – VOCAB-SPLIT / JSON-TRIM / GRAMMAR-3 / FLOW-CLEAN")
            logger.info(f"  Scoring models  : A={SCORING_MODEL_A}  B={SCORING_MODEL_B}")
            logger.info(f"  Error detection : {ERROR_DETECTION_MODEL} @ temp=dynamic(gpt4:{ERROR_DETECTION_TEMPERATURE_GPT4}/gpt5:1.0)")
            logger.info(f"  Grammar AI      : {GRAMMAR_MODEL} (prefetched, exactly 3 enrichments)")
            logger.info("  Vocab           : 3 parallel batches (10 items each = 30 total)")
            logger.info("=" * 80)

            # CHANGE 3: exactly 3 enrichments in prefetch prompt
            grammar_system = (
                "You are an expert IELTS Grammar Specialist focusing on Grammatical Range and Accuracy. "
                "Respond only with a valid JSON object."
            )
            grammar_user = f"""
ESSAY PROMPT: {essay_prompt}
USER ANSWER: {user_answer}

TASK: Analyse the grammar in this essay deeply and provide a structured report.

**1. DETECTED STRUCTURES**
List the grammatical structures the student ACTUALLY used in the text. Be specific.

**2. SUGGESTED ENRICHMENTS — EXACTLY 3 ITEMS**
Identify exactly 3 specific grammar structures missing or underutilised that would reach Band 8+.
You MUST provide exactly 3 items — no more, no less.

CRITICAL INSTRUCTIONS FOR ENRICHMENTS:
- "structure": Include a simple example in parentheses for non-technical users.
  e.g. "Complex Sentences with Subordinate Clauses (e.g., using 'although', 'which', or 'because')"
- "benefit": Explain why it helps (e.g., "Adds formal variety and links ideas logically").
- "example_context": Provide a specific example using the ACTUAL content of this essay.

**3. STRENGTHS & WEAKNESSES**
Write a concise summary analysing the grammatical performance.

**4. CRITICAL EXPERT TIPS**
Provide specific, actionable tips to enhance the grammatical quality.

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

            logger.info("\n[MEGA-BATCH] Launching 20 parallel API calls...")

            mega_batch_results = await asyncio.gather(
                # Error detection (4 calls) — indices 0-3
                self._detect_errors_for_criterion(user_answer, essay_prompt, "Task Response"),
                self._detect_errors_for_criterion(user_answer, essay_prompt, "Coherence & Cohesion"),
                self._detect_errors_for_criterion(user_answer, essay_prompt, "Lexical Resource"),
                self._detect_errors_for_criterion(user_answer, essay_prompt, "Grammatical Range & Accuracy"),
                # Scoring Model A — 4 single-criterion calls — indices 4-7
                self._perform_scoring_for_criteria_subset(user_answer, essay_prompt, ["Task Response"], SCORING_MODEL_A),
                self._perform_scoring_for_criteria_subset(user_answer, essay_prompt, ["Coherence & Cohesion"], SCORING_MODEL_A),
                self._perform_scoring_for_criteria_subset(user_answer, essay_prompt, ["Lexical Resource"], SCORING_MODEL_A),
                self._perform_scoring_for_criteria_subset(user_answer, essay_prompt, ["Grammatical Range & Accuracy"], SCORING_MODEL_A),
                # Scoring Model B — index 8
                self._perform_detailed_independent_scoring(user_answer, essay_prompt, SCORING_MODEL_B),
                # Revision — index 9
                self._generate_revision(user_answer, essay_prompt),
                # Grammar AI prefetch — index 10
                self._call_ai(grammar_system, grammar_user, task_name="GrammarPrefetch", model=GRAMMAR_MODEL, json_mode=True),
                # Argumentation — 2 parallel calls — indices 11-12
                self._analyze_argumentation_structural(user_answer, essay_prompt),
                self._analyze_argumentation_analytical(user_answer, essay_prompt),
                # Flow & Logic — 3 parallel calls — indices 13-15
                self._analyze_flow_macro(user_answer, essay_prompt),
                self._analyze_flow_sentence(user_answer, essay_prompt),
                self._analyze_flow_register(user_answer, essay_prompt),
                # Vocabulary — 3 parallel batches — indices 16-18 (CHANGE 1)
                self._generate_vocabulary_batch(user_answer, essay_prompt, 1, "Topic-Specific Nouns & Verbs", ["Topic-Specific Nouns", "Topic-Specific Verbs"]),
                self._generate_vocabulary_batch(user_answer, essay_prompt, 2, "Academic Adjectives & Adverbs/Collocations", ["Academic Adjectives", "Adverbs & Collocations"]),
                self._generate_vocabulary_batch(user_answer, essay_prompt, 3, "Advanced Phrases & Discourse Expressions", ["Advanced Phrases", "Discourse Expressions"]),
            )

            # Unpack
            tr_errors       = mega_batch_results[0]
            cc_errors       = mega_batch_results[1]
            lr_errors       = mega_batch_results[2]
            gra_errors      = mega_batch_results[3]
            scoring_round_a = {
                **mega_batch_results[4],
                **mega_batch_results[5],
                **mega_batch_results[6],
                **mega_batch_results[7],
            }
            scoring_round_b    = mega_batch_results[8]
            revision_data      = mega_batch_results[9]
            grammar_ai_raw     = mega_batch_results[10]
            argumentation_data = self._clean_authenticity_data({**mega_batch_results[11], **mega_batch_results[12]})
            flow_logic_raw     = {**mega_batch_results[13], **mega_batch_results[14], **mega_batch_results[15]}
            # CHANGE 4: clean flow data
            flow_logic_data    = self._clean_flow_data(flow_logic_raw)

            # CHANGE 1: merge vocabulary batches
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

            all_errors: List[dict] = tr_errors + cc_errors + lr_errors + gra_errors
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
                error_data, essay_prompt, user_answer,
                pre_fetched_ai_result=grammar_ai_raw,
            )
            logger.info("  → Grammar complete.")

            logger.info("\n[CPU] Generating detailed feedback (no API call)...")
            feedback_result = await self._generate_detailed_feedback(
                user_answer, essay_prompt, error_data, final_scores, averaged_scoring
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
                    "total_deductions":       0.0,
                    "score_before_rounding":  data.get("overall_score", 6.0),
                    "final_score":            data.get("overall_score", 6.0),
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

                "argumentation_analysis": argumentation_data,
                "flow_logic_analysis":    flow_logic_data,

                "score": str(final_scores["overall_band"]),
            }

            report_path = self._save_comprehensive_report(
                result, exam_name, essay_prompt, user_answer
            )
            if report_path:
                result["report_saved_to"] = report_path

            logger.info("\n" + "=" * 80)
            logger.info("GRADING COMPLETE")
            logger.info(f"  Overall Band  : {final_scores['overall_band']}")
            logger.info(f"  Errors found  : {len(all_errors)}")
            logger.info(f"  Vocabulary    : {len(merged_vocab)} items (3 batches)")
            logger.info(f"  Architecture  : 20-call mega-batch | Scoring-A×4 | Arg×2 | Flow×3 | Vocab×3")
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
    parser.add_argument("--exam-name", type=str, required=True)
    parser.add_argument("--prompt", type=str, required=True)
    parser.add_argument("--user-answer", type=str, required=True)
    args = parser.parse_args()

    api_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not api_key:
        logger.error(
            "OPENAI_API_KEY is not set. Put it in .env at the project root "
            "(see .env.example) or export OPENAI_API_KEY."
        )
        sys.exit(1)

    grader = IELTSGrader(api_key=api_key)
    result = asyncio.run(grader.grade_writing_answer(
        user_answer=args.user_answer,
        essay_prompt=args.prompt,
        exam_name=args.exam_name,
    ))
    print(json.dumps(result))