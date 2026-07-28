import openai
import json
import argparse
import os
import sys
import re
import logging
import base64
import tiktoken
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from collections import defaultdict
from error_postprocess import (
    log_postprocess_stats,
    normalize_paragraph_breaks,
    postprocess_detected_errors,
)

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
SCORING_MODEL_B        = "gpt-5.2"     # Second scoring pass – complex structured JSON + summary
ERROR_DETECTION_MODEL  = "gpt-5.2"     # Per-criterion error detection – complex structured JSON
VISION_MODEL           = "gpt-5.2"     # Chart image extraction – vision + reasoning model
VOCABULARY_MODEL       = "gpt-5.2"  # Vocabulary JSON extraction – cheaper
GRAMMAR_MODEL          = "gpt-5-mini"  # Grammar JSON extraction – cheaper
REVISION_MODEL         = "gpt-5-mini"     # Band-9 revision – complex structured JSON
ARGUMENTATION_MODEL    = "gpt-5.2"  # Data argumentation analysis
FLOW_LOGIC_MODEL       = "gpt-5.2"  # Flow and logic analysis

DEFAULT_MODEL = SCORING_MODEL_B

ERROR_DETECTION_TEMPERATURE_GPT4 = 0.2

# ============================================================================
# COMPREHENSIVE ERROR TAXONOMY - IELTS Writing Task 1 Academic Report
# ============================================================================
ERROR_TAXONOMY = {
    "task_type": "IELTS Writing Task 1 - Academic",
    "hierarchy": [
        {
            "official_criteria": "Task Response",
            "sub_categories": [
                {
                    "name": "Data Accuracy",
                    "tags": [
                        {
                            "id": "data_accuracy_error",
                            "label": "Data Accuracy Error",
                            "severity": "major",
                            "band_impact": -1.5,
                            "description": "A number, percentage, or data value cited in the report does not match the source chart.",
                            "detection_hint": "Cross-check every figure mentioned in the text against the reference data provided in the prompt.",
                            "example_triggers": [
                                "The graph shows 45% but the student writes 54%",
                                "Stating the peak year was 2005 when it was 2000"
                            ]
                        }
                    ]
                },
                {
                    "name": "Coverage",
                    "tags": [
                        {
                            "id": "task_achievement_partial",
                            "label": "Task Achievement Partial",
                            "severity": "major",
                            "band_impact": -1.5,
                            "description": "Fails to include key features or data trends from the chart/graph.",
                            "detection_hint": "Check if main data points or significant changes are mentioned; missing overview. Also: confirm features are absent from the FULL report before flagging.",
                            "example_triggers": ["Describing all data points without highlighting the main trend"]
                        },
                        {
                            "id": "key_feature_missing",
                            "label": "Key Feature Missing",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "A significant trend, peak, trough, or outlier visible in the data is not mentioned.",
                            "detection_hint": "Identify top 3-5 most notable features from the chart; check each against the response. Also: confirm each feature is absent from the FULL report before flagging.",
                            "example_triggers": [
                                "Ignoring the dramatic peak in 1995 while describing surrounding years",
                                "Not mentioning the only category that decreased while all others rose"
                            ]
                        }
                    ]
                },
                {
                    "name": "Overview/Position",
                    "tags": [
                        {
                            "id": "position_unclear_or_inconsistent",
                            "label": "Unclear or Inconsistent Position",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "The overview of the data is missing or contradicts the details provided.",
                            "detection_hint": "Ensure an overview paragraph is present and consistent with the data body. Also: compare overview with body across the FULL report.",
                            "example_triggers": ["Overview says data increased, but body paragraphs show a decrease"]
                        },
                        {
                            "id": "weak_or_missing_conclusion",
                            "label": "Weak or Missing Conclusion",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Fails to provide a final summary of the main data features.",
                            "detection_hint": "Absence of a concluding statement or a clear overview paragraph. Also: judge only after reading the FULL report.",
                            "example_triggers": ["Ending with a specific detail rather than a summary of the whole chart"]
                        }
                    ]
                },
                {
                    "name": "Comparison",
                    "tags": [
                        {
                            "id": "comparison_missing",
                            "label": "Comparison Missing",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "The response describes categories or time periods in isolation without comparing or contrasting them.",
                            "detection_hint": "Check whether the response uses comparative language ('higher than', 'while', 'whereas') to relate data groups. Also: do not flag if comparisons appear elsewhere in the FULL report.",
                            "example_triggers": [
                                "Describing Country A and Country B in separate sentences with no comparison",
                                "Listing yearly values without noting which was the highest or lowest"
                            ]
                        },
                        {
                            "id": "comparison_inaccurate",
                            "label": "Inaccurate Comparison",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "A comparison is made between categories or time periods but the relationship stated is factually wrong.",
                            "detection_hint": "Verify directional claims ('A was higher than B') against the reference data.",
                            "example_triggers": [
                                "Country A produced more than Country B, when the reverse is true"
                            ]
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
                            "description": "Trends are mentioned without supporting data (numbers/percentages).",
                            "detection_hint": "Descriptive claims about trends lacking numerical evidence from the prompt. Also: read the FULL paragraph before flagging — never flag a trend sentence if the same paragraph continues with figures, years, or comparisons.",
                            "example_triggers": ["The numbers went up. (No mention of how much or when)"]
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
                            "description": "Includes personal opinions or outside information not in the graph.",
                            "detection_hint": "Check for 'I think' or reasons for trends that are not visible in the provided data.",
                            "example_triggers": ["The sales fell because people were tired. (Reasoning not in the data)"]
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
                            "description": "Data report lacks a clear introduction, overview, and grouped details.",
                            "detection_hint": "Missing introduction/overview/body grouping. Also: judge overall sectioning only after reading the FULL report.",
                            "example_triggers": ["Randomly listing numbers without clear grouping"]
                        },
                        {
                            "id": "weak_topic_sentence",
                            "label": "Weak Topic Sentence",
                            "severity": "medium",
                            "band_impact": -0.75,
                            "description": "Paragraphs do not start with a clear summary of what trend is being discussed.",
                            "detection_hint": "Paragraph fails to signal the category or year-range being described.",
                            "example_triggers": ["Starting a paragraph with a specific number rather than a category name"]
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
                            "band_impact": -0.75,
                            "description": "Combining unrelated data categories into a single, confusing paragraph.",
                            "detection_hint": "Failure to group similar trends or contrasting categories together. Also: read the FULL paragraph before flagging.",
                            "example_triggers": ["Single paragraph mixing population data, oil prices, and birth rates"]
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
                            "band_impact": -1.0,
                            "description": "The report jumps between years or categories without a logical sequence.",
                            "detection_hint": "Time-based or category-based jumping that disrupts the flow of the report.",
                            "example_triggers": ["Describing 2010, then 1990, then 2005 with no logical reason"]
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
                            "description": "Mechanical use of 'In contrast', 'Similarly', and 'Additionally' at the start of every sentence.",
                            "detection_hint": "Linker repetition beyond threshold; mechanical flow.",
                            "example_triggers": ["Furthermore. In addition. Moreover. (Repetitive start)"]
                        },
                        {
                            "id": "underuse_linkers",
                            "label": "Underuse of Linking Words",
                            "severity": "medium",
                            "band_impact": -0.75,
                            "description": "Report feels like a list of numbers without comparative language.",
                            "detection_hint": "Lack of 'While', 'Whereas', or 'Compared to' to show relationships.",
                            "example_triggers": ["X was 10. Y was 20. Z was 30. (No linking)"]
                        },
                        {
                            "id": "wrong_linker",
                            "label": "Wrong Linking Word",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "A linking word is used but creates a false logical relationship between data points.",
                            "detection_hint": "Check semantic direction of linker against relationship of data being described.",
                            "example_triggers": [
                                "Oil rose and coal also fell. ('also' implies same direction but they differ)",
                                "However, both categories increased. ('however' implies contrast where none exists)"
                            ]
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
                            "description": "Using 'it' or 'the former' when describing multiple data lines, causing confusion.",
                            "detection_hint": "Ambiguous antecedent resolution in a multi-line graph description.",
                            "example_triggers": ["Both oil and coal fell, but it was lower in 2000. (Which one?)"]
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
                            "description": "Repeating 'increase' or 'decrease' without using synonyms like 'climb', 'plummet', or 'fluctuate'.",
                            "detection_hint": "High repetition of basic trend verbs and nouns.",
                            "example_triggers": ["Using 'went up' 8 times in one report"]
                        },
                        {
                            "id": "limited_vocabulary_range",
                            "label": "Limited Vocabulary Range",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "The entire response relies on a narrow set of trend words with no attempt at variety or sophistication.",
                            "detection_hint": "Type-token ratio for trend vocabulary is very low across the full response. Also: judge range across the FULL report (pattern-across-text), not one sentence.",
                            "example_triggers": [
                                "Only 'increase' and 'decrease' used across 200+ words",
                                "No use of adverbs (sharply, gradually) or nouns (surge, dip, plateau)"
                            ]
                        }
                    ]
                },
                {
                    "name": "Word Choice",
                    "tags": [
                        {
                            "id": "imprecise_word_choice",
                            "label": "Imprecise Word Choice",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Using adjectives like 'big' instead of precise ones like 'significant' or 'marginal'.",
                            "detection_hint": "Word sense mismatch for technical data description.",
                            "example_triggers": ["A 'huge' increase instead of a 'sharp' or 'dramatic' increase"]
                        },
                        {
                            "id": "collocation",
                            "label": "Collocation Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Unnatural combinations of trend words (e.g., 'a strong drop').",
                            "detection_hint": "Flagging non-standard data description collocations.",
                            "example_triggers": ["fluctuated slightly -> fluctuated wildly/marginally"]
                        },
                        {
                            "id": "awkward_phrase",
                            "label": "Awkward Phrase",
                            "severity": "low",
                            "band_impact": -0.25,
                            "description": "Unnatural phrasing of comparisons between data points.",
                            "detection_hint": "Low fluency scores for comparative structures.",
                            "example_triggers": ["X had more height than Y -> X was higher than Y"]
                        },
                        {
                            "id": "wrong_word_form",
                            "label": "Wrong Word Form",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Using noun forms instead of adverbs (e.g., 'increase significant' vs 'increased significantly').",
                            "detection_hint": "POS mismatch between expected trend form and used form.",
                            "example_triggers": ["rose slight -> rose slightly"]
                        },
                        {
                            "id": "typo_wordform",
                            "label": "Typo Affecting Word Form",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Minor typos that change the grammatical category of a data description.",
                            "detection_hint": "Edit distance=1 changing form.",
                            "example_triggers": ["decresed -> decreased; precentage -> percentage"]
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
                            "description": "Using informal language or contractions in a formal data report.",
                            "detection_hint": "Presence of 'don't', 'it's', or conversational slang.",
                            "example_triggers": ["The numbers were pretty cool -> significant"]
                        },
                        {
                            "id": "register_opinion",
                            "label": "Inappropriate Register (Opinion/Personal)",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Using first-person opinion language in what should be an objective data description.",
                            "detection_hint": "Detect 'I believe', 'I think', 'In my opinion', 'It is sad that'.",
                            "example_triggers": [
                                "I think the increase is very surprising.",
                                "It is unfortunate that the numbers fell so much."
                            ]
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
                            "description": "Incorrect spelling of chart-related words (e.g., percentages, categories).",
                            "detection_hint": "Dictionary lookup for report-specific vocabulary.",
                            "example_triggers": ["proporion -> proportion"]
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
                            "description": "Mismatch between categories and verbs.",
                            "detection_hint": "Singular category with plural verb or vice versa.",
                            "example_triggers": ["The figures shows -> show"]
                        },
                        {
                            "id": "article_determiner",
                            "label": "Article/Determiner Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Errors in articles before data categories or years.",
                            "detection_hint": "Incorrect use of 'the' or zero article with data.",
                            "example_triggers": ["In year 1990 -> In the year 1990"]
                        },
                        {
                            "id": "tense_aspect",
                            "label": "Tense/Aspect Error",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Using present tense to describe data from the past.",
                            "detection_hint": "Consistency check between dates in graph and verbs in text.",
                            "example_triggers": ["The rate rises in 1980 -> rose"]
                        },
                        {
                            "id": "plural_singular",
                            "label": "Plural/Singular Form Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Confusion between 'amount' vs 'number' or count/uncount nouns.",
                            "detection_hint": "Noun number mismatch with quantity determiners.",
                            "example_triggers": ["The number of waters -> amount of water"]
                        },
                        {
                            "id": "preposition",
                            "label": "Preposition Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Wrong prepositions for data (e.g., 'increase by' vs 'increase to').",
                            "detection_hint": "Collocation check for 'at/by/to/from' in data context.",
                            "example_triggers": ["increased at 10% -> increased by 10%"]
                        },
                        {
                            "id": "pronoun_case",
                            "label": "Pronoun Case Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Pronoun errors in complex comparative sentences.",
                            "detection_hint": "Subject/object confusion in comparisons.",
                            "example_triggers": ["It was higher than them -> higher than they (formal) or theirs"]
                        },
                        {
                            "id": "word_order",
                            "label": "Word Order Error",
                            "severity": "medium",
                            "band_impact": -0.75,
                            "description": "Incorrect placement of adverbs relative to trend verbs.",
                            "detection_hint": "Low probability n-gram sequences for trend descriptions.",
                            "example_triggers": ["fell significantly only -> only fell significantly"]
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
                            "description": "Capitalization errors in category titles or axis labels.",
                            "detection_hint": "Sentence-initial and proper noun check.",
                            "example_triggers": ["europe -> Europe; march -> March"]
                        },
                        {
                            "id": "punctuation_comma",
                            "label": "Comma Error",
                            "severity": "medium",
                            "band_impact": -0.5,
                            "description": "Missing commas in complex comparative clauses.",
                            "detection_hint": "Missing comma after subordinate or introductory data clauses.",
                            "example_triggers": ["While coal increased oil decreased. -> While coal increased, oil decreased."]
                        },
                        {
                            "id": "punctuation_sentence_boundary",
                            "label": "Sentence Boundary Error",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Fused sentences describing multiple distinct trends.",
                            "detection_hint": "Automated sentence splitter yields fragments > 50 tokens.",
                            "example_triggers": ["The first chart shows X the second chart shows Y."]
                        },
                        {
                            "id": "fragment",
                            "label": "Sentence Fragment",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Incomplete sentence missing a subject or verb, often when listing data.",
                            "detection_hint": "Missing verb or subject in a sentence describing data.",
                            "example_triggers": ["The price of oil at 50 dollars in 2010."]
                        },
                        {
                            "id": "run_on",
                            "label": "Run-on / Fused Sentences",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "Joining multiple data observations with commas only, without proper conjunction or punctuation.",
                            "detection_hint": "Comma splices between independent data observations.",
                            "example_triggers": ["Gold prices rose, silver prices fell, copper remained stable."]
                        }
                    ]
                },
                {
                    "name": "Complexity & Range",
                    "tags": [
                        {
                            "id": "limited_grammatical_range",
                            "label": "Limited Grammatical Range",
                            "severity": "high",
                            "band_impact": -1.0,
                            "description": "The response relies exclusively on simple sentences with no complex or compound structures.",
                            "detection_hint": "Absence of subordinate clauses, relative clauses, or non-finite structures across the full response. Also: judge range across the FULL report (pattern-across-text), not one sentence.",
                            "example_triggers": [
                                "Oil rose. Coal fell. Gas stayed. (Three simple sentences with no variety)",
                                "No use of 'which', 'while', 'having risen', 'despite' across the response"
                            ]
                        },
                        {
                            "id": "subordination_error",
                            "label": "Subordination / Complex Sentence Error",
                            "severity": "medium",
                            "band_impact": -0.75,
                            "description": "Errors in forming subordinate clauses when describing conditions, contrasts, or time relationships in the data.",
                            "detection_hint": "Check clause attachment and conjunction use in complex sentences.",
                            "example_triggers": [
                                "Although oil increased, but coal also rose. (Double conjunction)",
                                "Despite the prices rose sharply. (Gerund needed: Despite prices rising sharply)"
                            ]
                        },
                        {
                            "id": "modifier_error",
                            "label": "Modifier Error (Dangling/Misplaced)",
                            "severity": "medium",
                            "band_impact": -0.75,
                            "description": "Using modifiers that don't clearly attach to a specific year or category.",
                            "detection_hint": "Adverbial clause with no clear subject reference.",
                            "example_triggers": ["Looking at the chart, the trend is clear. (Dangling)"]
                        },
                        {
                            "id": "parallelism",
                            "label": "Parallelism Error",
                            "severity": "low",
                            "band_impact": -0.25,
                            "description": "Inconsistent structure when comparing multiple trends.",
                            "detection_hint": "Coordinate structures where forms differ across comparisons.",
                            "example_triggers": ["Oil prices rose, but decreasing coal was seen."]
                        }
                    ]
                }
            ]
        }
    ]
}

SUB_ITEM_ERROR_MAPPING = {
    "Task Response": {
        "Data Accuracy":     ["data_accuracy_error"],
        "Coverage":          ["task_achievement_partial", "key_feature_missing"],
        "Overview/Position": ["position_unclear_or_inconsistent", "weak_or_missing_conclusion"],
        "Comparison":        ["comparison_missing", "comparison_inaccurate"],
        "Development":       ["ideas_underdeveloped"],
        "Relevance":         ["irrelevant_or_off_topic_content"]
    },
    "Coherence & Cohesion": {
        "Structure":        ["poor_overall_structure", "weak_topic_sentence"],
        "Paragraphing":     ["paragraph_unity"],
        "Progression":      ["logical_progression_gap"],
        "Cohesive Devices": ["overuse_linkers", "underuse_linkers", "wrong_linker"],
        "Referencing":      ["unclear_referencing"]
    },
    "Lexical Resource": {
        "Range":      ["repetition_basic_lexis", "limited_vocabulary_range"],
        "Word Choice": ["imprecise_word_choice", "collocation", "awkward_phrase", "wrong_word_form", "typo_wordform"],
        "Register":   ["register_informal", "register_opinion"],
        "Spelling":   ["misspelling"]
    },
    "Grammatical Range & Accuracy": {
        "Accuracy":          ["subject_verb_agreement", "article_determiner", "tense_aspect", "plural_singular", "preposition", "pronoun_case", "word_order"],
        "Punctuation":       ["capitalization", "punctuation_comma", "punctuation_sentence_boundary", "fragment", "run_on"],
        "Complexity & Range": ["limited_grammatical_range", "subordination_error", "modifier_error", "parallelism"]
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

class Task1ReportGrader:
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

    # ------------------------------------------------------------------
    # CHART REFERENCE GENERATOR — IMAGE SCREENSHOT PATH
    # ------------------------------------------------------------------

    async def _extract_chart_data_from_image(
        self, image_b64: str, fallback_prompt: str, chart_type: str
    ) -> dict:
        """
        Use GPT-4o vision to extract all chart data + question text from a
        screenshot.  Returns the same {"text": ..., "extracted_prompt": ...}
        shape as _generate_chart_reference so the rest of grade_report() is
        unchanged.
        """
        # Extract MIME type before stripping the data-URL prefix
        _mime_type = "image/jpeg"
        if image_b64.startswith("data:"):
            _m = re.match(r"data:(image/[^;]+);base64,", image_b64)
            if _m:
                _mime_type = _m.group(1)
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]

        vision_prompt = (
            "You are an expert IELTS Task 1 chart analyst. Your PRIMARY job is to extract "
            "EXACT numerical values from the chart so they can be used as ground-truth reference data.\n\n"
            "════════════════════════════════════════════════════════\n"
            "MANDATORY PRE-EXTRACTION: AXIS CALIBRATION (do this FIRST, before reading any data)\n"
            "════════════════════════════════════════════════════════\n"
            "1. Identify every Y-axis gridline and its labelled value. List them ALL in order from bottom to top.\n"
            "   Example output: 'Left Y-axis gridlines: 0, 20, 40, 60, 80, 100'\n"
            "2. CRITICAL BASELINE CHECK: Confirm that value 0 is at the BOTTOM edge of the plot area.\n"
            "   The plot area baseline (where bars start) corresponds to the LOWEST gridline value (usually 0).\n"
            "   Do NOT treat the bottom of the image or any padding/label area as the zero line.\n"
            "3. Compute the gridline interval (gap between consecutive gridlines). Example: if gridlines are 0,20,40,60,80,100 → interval = 20.\n"
            "4. For each bar: the bar's VALUE = the gridline value at the bar's baseline + (fraction of interval the bar top has risen above that gridline × interval).\n"
            "   NEVER estimate a bar as a percentage of the total image/chart area height — always anchor to the axis scale.\n\n"
            "CRITICAL RULES FOR DATA EXTRACTION (apply the rules relevant to this chart type):\n"
            "BAR / GROUPED BAR / TIME-SERIES BAR:\n"
            "  Step 1 — Write out all x-axis labels in order (left to right).\n"
            "  Step 2 — For EACH bar (left to right), use the GRIDLINE METHOD with the calibrated scale:\n"
            "    a) Find which two consecutive gridlines the bar top falls BETWEEN. State both values.\n"
            "    b) Estimate how far (as a fraction 0–1) the bar top is above the lower gridline.\n"
            "    c) Value = lower_gridline + fraction × interval. Show this calculation explicitly.\n"
            "       Example: bar top between 20 and 40, ~60% up → 20 + 0.6×20 = 32\n"
            "    d) Write: 'Bar [label]: between [Y1] and [Y2], ~[F]% up → [Y1] + [F]×[interval] = [VALUE]'\n"
            "  Step 3 — STRICT YEAR ALIGNMENT: 1st bar (leftmost) = 1st x-label, 2nd bar = 2nd x-label, etc. NEVER shift.\n"
            "  Step 4 — Self-check: do all values form a logically consistent sequence? If not, re-read any outlier.\n"
            "LINE GRAPH (single or multiple lines):\n"
            "  - For each data point, read the Y value at the exact X-axis tick. Do NOT interpolate between ticks.\n"
            "MIXED CHART (bars + lines on dual axes):\n"
            "  - Perform the MANDATORY PRE-EXTRACTION axis calibration for BOTH left and right axes separately.\n"
            "  - Bars → LEFT axis only. Lines → RIGHT axis only (or confirm from legend). NEVER mix axes.\n"
            "  - Apply the GRIDLINE METHOD (Steps 1–4 above) for bars using the LEFT axis calibration.\n"
            "  - For line data points, read each point against the RIGHT axis gridlines using the same fraction method.\n"
            "PIE CHART:\n"
            "  - Read the percentage or value label printed ON or BESIDE each segment directly.\n"
            "  - Do NOT estimate from segment arc size — use the printed numbers only.\n"
            "  - List all segments. Verify they sum to 100% (or to the stated total).\n"
            "TABLE:\n"
            "  - Read every cell value exactly as printed. Preserve row and column headers.\n"
            "  - Do NOT round unless the cell itself is rounded.\n\n"
            "Output ALL information in this exact format (no JSON, no markdown, plain text only):\n\n"
            "CHART TITLE: [exact title]\n"
            "CHART TYPE: [e.g. mixed chart / bar chart / line graph / pie chart / table / map / process]\n"
            "X-AXIS: [label and all tick values, or 'N/A' for pie/table/process]\n"
            "LEFT Y-AXIS: [label and unit; or 'N/A' for pie/table; write 'None' if only one axis]\n"
            "RIGHT Y-AXIS: [label and unit if a second axis exists, else 'None']\n\n"
            "REFERENCE DATA (all exact values per series — cover EVERY data point):\n"
            "[Bars/Lines: 'Series Name: xLabel1=value1, xLabel2=value2, ...']\n"
            "[Pie: 'Category Name: percentage%' for every segment]\n"
            "[Table: 'Row Name: ColHeader1=val1, ColHeader2=val2, ...' for every row]\n"
            "  Format example (generic — do NOT use these numbers for any real chart): Bar Series A: 2000=110, 2005=175, 2010=240\n"
            "  Format example (generic — do NOT use these numbers for any real chart): Pie: North=42%, South=31%, East=27%\n"
            "  WARNING: the format examples above are NOT reference data. Extract the ACTUAL values from the image.\n\n"
            "KEY TRENDS:\n"
            "1. [most important overall trend]\n"
            "2. [second notable trend or comparison]\n"
            "3. [any notable peaks, troughs, or anomalies]\n\n"
            "QUESTION TEXT:\n"
            "[Copy the full question/instruction text exactly as it appears in the image, "
            "including any bullet points. Do NOT include the chart title here.]\n\n"
            "DATA ACCURACY CHECKING INSTRUCTION:\n"
            "Accept stated values within ±15% tolerance for rounding. "
            "Only flag as data error if value differs by >15% from reference."
        )

        try:
            response = await self.client.chat.completions.create(
                model=VISION_MODEL,
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": vision_prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{_mime_type};base64,{image_b64}",
                            },
                        },
                    ],
                }],
                temperature=1.0,
                max_completion_tokens=8000,
            )
            extracted = response.choices[0].message.content.strip()
            logger.info("[IMAGE] Chart data extracted via %s (%d chars)", VISION_MODEL, len(extracted))

            # Pull the question text section for report_prompt replacement
            q_match = re.search(
                r"QUESTION TEXT:\s*(.*?)(?:\n\nDATA ACCURACY|\Z)",
                extracted, re.DOTALL | re.IGNORECASE,
            )
            extracted_prompt = q_match.group(1).strip() if q_match else ""

            return {
                "text": f"REFERENCE DATA FOR GRADING (Extracted from chart screenshot via {VISION_MODEL} Vision):\n\n{extracted}",
                "extracted_prompt": extracted_prompt,
            }

        except Exception as e:
            logger.warning("[IMAGE] Vision extraction failed with %s (%s) — falling back to synthetic reference", VISION_MODEL, e)
            return self._generate_chart_reference(fallback_prompt, chart_type)

    # ------------------------------------------------------------------
    # CHART REFERENCE GENERATOR
    # ------------------------------------------------------------------

    def _generate_chart_reference(self, report_prompt: str, chart_type: str) -> dict:
        rp = (report_prompt or "").strip()
        rp_low = rp.lower()

        # If the prompt already contains embedded SVG, instruct the AIs to read it directly
        # instead of fabricating synthetic reference data.
        if '<svg' in rp:
            chart_data_context = """REFERENCE DATA FOR GRADING:
The chart SVG is embedded directly in the REPORT PROMPT above.
Read the exact values from the SVG XML — axis labels (<text> elements), data-point coordinates,
bar heights, and legend labels — to determine the true data values for Data Accuracy checking.
Apply ±15% tolerance for reasonable rounding.
Do NOT invent or substitute synthetic values."""
            return {"text": chart_data_context}
            chart_data_context = """
REFERENCE DATA FOR GRADING (The "Ground Truth" for this specific chart):
Chart Title: Further Education in Britain (Men & Women)
Unit: Thousands

CRITICAL UNIT INTERPRETATION FOR DATA ACCURACY CHECKING:
The chart displays values in THOUSANDS. All Y-axis numbers must be multiplied by 1,000.
- Chart shows "1200" → Actual value: 1,200,000 (1.2 million)
- Chart shows "100"  → Actual value: 100,000 (100 thousand)

ACCEPTABLE VALUE REPRESENTATIONS (all equivalent):
For value 100 (thousands): "100 thousand", "100k", "100,000", "0.1 million", "100000"
For value 1000 (thousands): "1000 thousand", "1000k", "1,000,000", "1 million", "1M"

GRADING INSTRUCTION FOR DATA ACCURACY:
- Compare MAGNITUDES, not literal strings
- Accept ANY equivalent representation
- Allow ±15% tolerance for rounding
- Only flag as error if magnitude differs by >15%

REFERENCE VALUES (in thousands):

1970/71:
- Men Full-time: 100 (thousands) = 100,000 people
- Men Part-time: 1000 (thousands) = 1,000,000 people (HIGHEST for Men)
- Women Full-time: 50 (thousands) = 50,000 people (LOWEST overall)
- Women Part-time: 700 (thousands) = 700,000 people

1980/81:
- Men Full-time: 130 (thousands) = 130,000 people
- Men Part-time: 820 (thousands) = 820,000 people
- Women Full-time: 80 (thousands) = 80,000 people
- Women Part-time: 800 (thousands) = 800,000 people

1990/91:
- Men Full-time: 150 (thousands) = 150,000 people
- Men Part-time: 850 (thousands) = 850,000 people
- Women Full-time: 100 (thousands) = 100,000 people
- Women Part-time: 1100 (thousands) = 1,100,000 people (HIGHEST overall)

KEY TRENDS:
1. Part-time numbers are significantly higher than Full-time for both genders in all periods.
2. Men Part-time decreased overall (1000k → 820k → 850k); Women Part-time increased significantly (700k → 800k → 1100k).
3. By 1990/91, Women Part-time (1100k) overtook Men Part-time (850k).
4. Full-time rose steadily for both genders but remained relatively low compared to part-time.

DATA ACCURACY ERROR DETECTION RULES:
FLAG as data_accuracy_error ONLY if value differs by MORE than 15% from reference.
DO NOT FLAG unit representation differences (1.1M vs 1100k vs 1,100,000).
"""
            return {"text": chart_data_context}

        years = ["2000", "2010", "2020"]
        base = max(20, len(rp) % 200)
        s1 = [base + 50, base + 90, base + 140]
        s2 = [base + 80, base + 60, base + 170]

        chart_data_context = f"""
REFERENCE DATA FOR GRADING (Synthesised):
Chart Title: {rp or 'Sample Chart'}
Unit: Units (no multiplier specified)

DATA ACCURACY CHECKING INSTRUCTION:
Accept values as displayed. Allow ±15% tolerance for reasonable rounding.

{years[0]}: Series A: {s1[0]} units | Series B: {s2[0]} units
{years[1]}: Series A: {s1[1]} units | Series B: {s2[1]} units
{years[2]}: Series A: {s1[2]} units | Series B: {s2[2]} units

KEY TRENDS:
- Series B rises more sharply towards the final year.
- Series A shows steady increase.

DATA ACCURACY ERROR DETECTION: Only flag if stated value differs by >15% from reference.
"""
        return {"text": chart_data_context}

    # ------------------------------------------------------------------
    # TAXONOMY REFERENCE GENERATORS
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # PER-CRITERION ERROR DETECTION (4 focused passes)
    # ------------------------------------------------------------------

    async def _detect_errors_for_criterion(
        self, user_answer: str, report_prompt: str, chart_data_context: str, criterion_name: str
    ) -> List[dict]:
        taxonomy_ref = self._generate_criterion_taxonomy_reference(criterion_name)

        system_prompt = f"""You are a forensic IELTS error specialist trained to find every deviation
from perfect academic English in student Academic Reports (Task 1).

YOUR SINGLE FOCUS TODAY: **{criterion_name}**

This is your ONLY task. Be exhaustively thorough for this one criterion.

YOUR GOAL: Find every genuine error — major and minor.

# ACCURACY RULES:
# - Only use error IDs that exist in the taxonomy below — no invented categories
# - If something is acceptable in formal academic English, do NOT flag it

COMPLETENESS RULES (prevent misses):
- Do not stop at obvious errors — check every sentence and word for subtle issues too, all count, all must be reported
- Minor errors (low severity) are still errors — include them

CONTEXT SCOPE BY ERROR TYPE (additive — apply ONLY to the listed IDs; do not change how other tags are judged):
- SHORT-SPAN (default for most tags — phrase/sentence): grammar, punctuation, spelling, articles, prepositions, word form, imprecise_word_choice, collocation, awkward_phrase, data_accuracy_error on a specific figure, and similar local tags.
- PARAGRAPH-SCOPE IDs only (read the FULL paragraph before flagging): ideas_underdeveloped, paragraph_unity, logical_progression_gap, weak_topic_sentence.
- WHOLE-REPORT-SCOPE IDs only (read the FULL report before flagging): task_achievement_partial, key_feature_missing, comparison_missing, position_unclear_or_inconsistent, weak_or_missing_conclusion, poor_overall_structure.
- PATTERN-ACROSS-TEXT IDs only (scan full text for frequency/range patterns): limited_vocabulary_range, limited_grammatical_range, repetition_basic_lexis, overuse_linkers, underuse_linkers.
- ideas_underdeveloped only: a trend claim is NOT underdeveloped if the same paragraph continues with numbers, years, percentages, or comparisons. Only flag when the paragraph as a WHOLE lacks quantitative support. original_text may quote the claim, but the explanation must confirm the rest of the paragraph was checked.

The correct number of errors is however many actually exist. There is no floor and no ceiling. Report exactly what you find.

CRITICAL OUTPUT RULES:
- Return ONLY a valid JSON object
- Every "original_text" must be a verbatim quote of 3–10 words from the report
- Every error must map to a tag ID from the taxonomy below
"""

        if criterion_name == "Task Response":
            system_prompt += """

🔢 ABSOLUTELY CRITICAL FOR DATA ACCURACY ERRORS:

You are checking a chart-based academic report. The reference data includes explicit UNIT information.

Many charts use scaled units like "Thousands" or "Millions" for readability.
Students can correctly express scaled values in MULTIPLE equivalent ways:
✓ "1200 thousand" / "1200k" / "1.2 million" / "1.2M" / "1,200,000" — ALL CORRECT.

Your task:
1. Read the UNIT specification in reference data very carefully.
2. For each numerical claim: normalize both student and reference to base number.
3. Compare magnitudes: |student_value - reference_value| / reference_value.
4. Flag data_accuracy_error ONLY if percentage difference > 15%.

DO NOT FLAG: different unit representations of the same value, minor rounding within ±15%, formatting differences.

FEEDBACK STYLE: When writing the 'explanation' for a data_accuracy_error, state the student's value and the reference value and describe the discrepancy in plain language (e.g. "the student wrote X bn$, but the chart shows Y bn$, which is more than 15% higher/lower, exceeding the 15% tolerance"). Do NOT include raw mathematical formula notation such as |X-Y|/Z = N% in any explanation or feedback field.

ABSOLUTE RULE — NO COMPOUNDING LOGIC:
Each numerical value MUST be evaluated INDEPENDENTLY. NEVER flag a value that is within ±15% of the reference just because other values in the same report are also inaccurate. 'Systematic misreporting' is NOT a valid reason to penalise a within-tolerance value. If the percentage difference is ≤15%, it MUST be accepted — full stop.

ABSOLUTE RULE — NO FABRICATED PERCENTAGES:
You MUST compute the actual percentage difference before stating any claim about tolerance. A small absolute difference (e.g. 2 years out of 70) is approximately 2.9%, NOT more than 15%. Never claim a value "exceeds the 15% tolerance" without first computing abs(student - reference) / reference * 100 and confirming it is > 15.

ABSOLUTE RULE — SELF-CONSISTENCY (this fixes a known failure mode):
A data_accuracy_error whose own explanation concludes the value is "within tolerance", "acceptable", "not a real error", or similar is a CONTRADICTION, not a valid error. If you find yourself about to write an explanation like that, this means the value passed the check — DO NOT add a data_accuracy_error entry for it at all. An entry only belongs in the errors list if your explanation unambiguously concludes the discrepancy EXCEEDS the 15% tolerance and IS a genuine error.

ABSOLUTE RULE — UNREADABLE/MISSING REFERENCE DATA IS NOT EVIDENCE OF AN ERROR:
The reference data below may occasionally note that some axis, gridline, or tick label was unreadable, unclear, garbled, or could not be extracted from the chart image. This is a LIMITATION OF THE EXTRACTION PROCESS, not a fact about the student's report, and it must NEVER be used to flag data_accuracy_error.
- Absence of proof is NOT proof of a mistake. If you cannot cross-check a specific number/year/label against clear reference data, you MUST treat that claim as UNVERIFIED and say nothing about it — do NOT create an error for it "just in case."
- NEVER write a data_accuracy_error whose justification is that the reference/chart data is unreadable, garbled, missing, or otherwise unavailable — that is disqualifying, not incriminating.
- Only ever flag data_accuracy_error when the reference data gives you a CLEAR, READABLE value or label that DIRECTLY CONTRADICTS the student's claim by more than 15%. If in doubt, do not flag.

ABSOLUTE RULE — APPROXIMATE LANGUAGE IS NOT AN ERROR (IELTS Task 1 expects it):
Phrases such as "nearly 2", "around 1.5", "just over 3", "approximately 80", "roughly 34", "about 5.5" are CORRECT academic reporting when the implied magnitude is within ±15% of the reference value.
Example: reference = 1.9, student writes "nearly 2 tonnes" → |2 − 1.9| / 1.9 ≈ 5% → MUST NOT flag.
Do NOT flag data_accuracy_error merely because the student did not write the exact decimal from the reference. Only flag when the implied number differs by MORE than 15%.
"""

        checklists = {
            "Task Response": """
EXHAUSTIVE CHECKLIST – Task Response (Academic Report):

□ 🔢 CRITICAL - DATA ACCURACY CHECKING (use unit-aware semantic comparison):
  For EACH numerical value in the student's report:
  a) Check if it matches any "Acceptable" representation listed in reference data
  b) If not listed, convert both to base number and compare magnitudes
  c) Compute the percentage difference as a number: abs(student_val - ref_val) / ref_val * 100. Write this number explicitly before deciding. Example: student=72, reference=70 → abs(72-70)/70*100 = 2.9% → within tolerance, MUST NOT flag.
  d) Flag as data_accuracy_error ONLY if that computed percentage > 15%. A small absolute difference such as 2 units is NEVER more than 15% unless the reference value itself is tiny (under ~13). Never describe a small absolute gap as exceeding the tolerance without the computed percentage confirming it.
  e) NO COMPOUNDING: if the value is ≤15% different, do NOT flag it regardless of other errors in the report.
  Do NOT flag different unit representations of the same value.
  NEVER use 'systematic misreporting' reasoning to override the ±15% tolerance rule.
  f) EXPLANATION FORMAT: write explanations in plain language only. Do NOT include mathematical formulas like |X-Y|/Z = N% in any 'explanation' or 'context' field.
  g) IF THE REFERENCE DATA IS UNREADABLE/MISSING for a value: do NOT flag it. An extraction limitation is not evidence the student is wrong — skip that claim entirely rather than flagging it.
  h) APPROXIMATE LANGUAGE: "nearly / around / about / roughly / just over / approximately X" is acceptable whenever X is within ±15% of the reference. Do NOT flag "nearly 2" for a reference of 1.9 (only ~5% off).

□ COVERAGE: Does the report cover ALL key features shown in the chart (peaks, troughs, outliers)?
□ Are significant features highlighted (highest/lowest values, dramatic changes)?
□ Check for missing key trends clearly visible in the data.

□ OVERVIEW/POSITION: Is there a clear overview paragraph identifying the MAIN trends (not just individual data points)?
□ Is the overview logically consistent with the detailed body paragraphs?
□ Does the report have a concluding summary of the main findings?

□ COMPARISON: Are comparisons made between categories, series, or time periods where relevant?
□ Check for comparison_missing: are two or more data series described without any contrast?
□ Check for comparison_inaccurate: are directional claims verified against the reference data?

□ DEVELOPMENT: Are trends mentioned with supporting data (numbers/percentages)?
□ Check for descriptive claims about trends lacking numerical evidence from the prompt.
□ ideas_underdeveloped only: read the ENTIRE paragraph before flagging — do not flag a trend claim if figures appear later in the same paragraph.

□ RELEVANCE: Is all content relevant to the chart data only (no personal opinions or external reasoning)?
□ Check for 'I think' or reasons for trends that are not visible in the provided data.
""",

            "Coherence & Cohesion": """
EXHAUSTIVE CHECKLIST – Coherence & Cohesion (Academic Report):
□ Is there a clear Introduction → Overview → Body paragraph structure?
□ Does EVERY body paragraph open with a clear topic sentence signalling the category/time period?
□ Is data logically grouped (similar categories together, not randomly mixed)?
□ Are cohesive devices (linkers) used appropriately — neither over- nor under-used?
□ Check for wrong_linker: is any linking word creating a false logical relationship?
□ Are all pronouns and references ('it', 'this figure', 'the former') unambiguous?
□ Is there a logical sequence in describing data (not jumping randomly between years/categories)?
□ Are there sentence fragments (a phrase without a main verb presenting data)?
□ Are there any run-on sentences that fuse multiple data observations with only commas?
□ Check EVERY paragraph transition for smooth and logical flow.
""",

            "Lexical Resource": """
EXHAUSTIVE CHECKLIST – Lexical Resource (Academic Report):
□ Count repetitions: flag any trend verb ('increase', 'decrease', 'went up') repeated 3+ times without variation.
□ Is a range of data vocabulary used (surge, plummet, stabilise, fluctuate, level off)?
□ Are adverbs of degree used (sharply, gradually, steadily, marginally, dramatically)?
□ Are there imprecise word choices ('big' instead of 'significant', 'huge' instead of 'sharp')?
□ Are there collocation errors (e.g., 'a strong drop' instead of 'a sharp drop')?
□ Are there register issues — contractions (don't, it's) or conversational slang?
□ Are there opinion/personal register violations (I think, In my view, It is sad that)?
□ Are there misspellings of chart-related vocabulary?
□ Are there awkward phrases that suggest difficulty with comparative data structures?
□ Are words used in the wrong grammatical form (adjective instead of adverb in trend description)?
""",

            "Grammatical Range & Accuracy": """
EXHAUSTIVE CHECKLIST – Grammatical Range & Accuracy (Academic Report):
□ Check EVERY verb for subject-verb agreement with its subject (data series, figures, numbers).
□ Check EVERY article (a / an / the / zero) for correctness before categories and years.
□ Check EVERY preposition for correct collocation in data context (increase BY/TO/FROM, AT a level).
□ Check tense consistency: past simple must be used for all historical chart data.
□ Check EVERY noun for correct plural/singular form (amount vs number, data as plural).
□ Check ALL punctuation: commas after introductory clauses, sentence boundaries, capitals.
□ Check for sentence fragments (a data phrase without a finite verb).
□ Check for run-on / fused sentences joining multiple data observations without proper punctuation.
□ Check for limited_grammatical_range: does the report rely exclusively on simple SVO sentences?
□ Check ALL comparative structures for subordination errors (double conjunctions, gerund errors).
□ Check ALL participial/relative clauses for dangling or misplaced modifiers.
□ Check ALL list structures for parallelism.
"""
        }

        checklist = checklists.get(criterion_name, "□ Check all errors for this criterion thoroughly.")

        user_prompt = f"""
REPORT PROMPT:
{report_prompt}

{chart_data_context}

USER REPORT:
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
- original_text   : EXACT verbatim quote (3–10 words) from the report
- corrected_text  : The corrected version — a real, usable piece of text the student could
                     paste into their report. NEVER write a bracketed placeholder like
                     "[unit not readable]", "[unclear]", or "[value unknown]" here. If you
                     cannot confidently produce an actual corrected value/word (e.g. because
                     the reference data for that specific detail is unreadable), that means
                     you cannot properly correct it — do NOT include this error at all.
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
Re-read the report one more time looking specifically for:
  1. Any imprecise or repeated trend vocabulary
  2. Any missing comma after 'However', 'While', 'Furthermore', etc.
  3. Any vague pronoun reference ('it', 'this', 'they') without a clear antecedent data category
  4. Any paragraph whose topic sentence is weak or begins with a specific figure rather than a category
If the report is genuinely error-free for this criterion, return {{"errors": []}} — but only then.
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
        errors, stats = postprocess_detected_errors(errors, user_answer)
        log_postprocess_stats(logger, criterion_name, stats)
        logger.info(f"  → [{criterion_name}] {len(errors)} error(s) detected.")
        return errors

    # ------------------------------------------------------------------
    # MODEL B: FULL SCORING + SUMMARY
    # ------------------------------------------------------------------

    async def _perform_detailed_independent_scoring(
        self, user_answer: str, report_prompt: str, chart_data_context: str, model: str = SCORING_MODEL_B
    ) -> dict:
        include_summary = (model == SCORING_MODEL_B)

        system_prompt = f"""You are a senior IELTS examiner with 20+ years of experience in Academic Writing Task 1 (Report).
You are scoring with {model}.

Provide detailed band scores (0.5 increments from 1.0 to 9.0) for:
1. Each MAIN criterion (4 total)
2. Each SUB-CATEGORY within each criterion

Be SPECIFIC and DETAILED. Provide concrete evidence and quotes from the report.
Your scores must REFLECT THE ACTUAL QUALITY of the report — do not default to the middle.

OFFICIAL IELTS BAND CALIBRATION FOR ACADEMIC REPORT (Task 1) — use these as concrete anchors:

TASK RESPONSE
  Band 9 : All key features fully covered with accurate data; clear, effective overview; precise comparisons made throughout; fully relevant, no opinions
  Band 8 : Key features covered; minor gaps in detail or comparison; overview present and clear; data mostly accurate
  Band 7 : Main features covered; adequate data support and comparisons; overview present but may lack precision
  Band 6 : Task addressed but some features inadequately covered; overview present but may be unclear; limited comparison
  Band 5 : Partially addresses task; overview vague or missing; limited comparisons; some data inaccuracies present
  Band 4 : Only minimally addresses task; no clear overview; little data cited; comparisons absent

COHERENCE & COHESION
  Band 9 : Seamless logical organisation; data grouping invisible and natural; perfect paragraphing; all referencing unambiguous
  Band 8 : Well-organised; occasional minor cohesion fault; paragraphing effective; mostly clear referencing
  Band 7 : Clear progression; uses a range of cohesive devices with occasional over/under-use; paragraphing logical
  Band 6 : Arranges information coherently but cohesive devices mechanical or limited; inadequate paragraphing possible
  Band 5 : Some organisation; over-use or under-use of linkers; limited range; wrong linkers present
  Band 4 : Limited organisation; connectives wrong or missing; paragraph structure weak; random data ordering

LEXICAL RESOURCE
  Band 9 : Full range of data and trend vocabulary; precise collocations; sophisticated adverbial modification; no errors
  Band 8 : Wide data vocabulary; sophisticated trend terms; minor errors in word choice/collocation
  Band 7 : Sufficient range of trend language; some less-common data vocabulary; occasional errors in word choice
  Band 6 : Adequate trend vocabulary; noticeable repetition; errors in word choice/collocation; some awkward phrasing
  Band 5 : Limited range; repetition of basic trend words (increase/decrease only); errors may cause strain for reader
  Band 4 : Very limited trend vocabulary; errors in basic data terminology; meaning sometimes obscured

GRAMMATICAL RANGE & ACCURACY
  Band 9 : Wide range of structures for comparison and trend description; rare errors; complex sentences managed naturally
  Band 8 : Variety of structures; majority error-free; occasional slips in complex comparative sentences
  Band 7 : Mix of structures; errors occur but rarely affect communication; some complex forms attempted
  Band 6 : Mix of simple and complex; errors in complex structures; errors do not impede communication
  Band 5 : Limited range; frequent grammatical errors; may cause difficulty for reader
  Band 4 : Very limited range; errors dominate; communication frequently impeded

IMPORTANT: A Band 4–5 report and a Band 8–9 report must receive substantially different scores.
Do NOT converge toward 6.0–7.0 unless the report genuinely falls in that range.
Score what you actually read, not what you expect the average report to look like."""

        if not include_summary:
            user_prompt = f"""
REPORT PROMPT: {report_prompt}

{chart_data_context}

USER REPORT:
{user_answer}

Provide a DETAILED holistic assessment. For each criterion and sub-category below,
give: score, strengths, weaknesses, and evidence (specific quotes from the report).

**TASK RESPONSE** – assess these 6 sub-categories:
  • Data Accuracy: Are numerical claims accurate against the reference data (semantic comparison, ±15% tolerance)?
  • Coverage: Are ALL key features mentioned (peaks, troughs, outliers, major changes)?
  • Overview/Position: Is a clear overview present summarising main trends? Is it consistent with the body?
  • Comparison: Are meaningful comparisons/contrasts made between categories, groups, or time periods?
  • Development: Are trend statements supported with appropriate quantitative evidence?
  • Relevance: Is all content drawn from the chart only (no opinions, causes, or external information)?

**COHERENCE & COHESION** – assess these 5 sub-categories:
  • Structure: Is the report properly organised (introduction, overview, body paragraphs)?
  • Paragraphing: Are paragraphs unified, with clear topic sentences for each data group?
  • Progression: Does data flow logically without random jumps between years/categories?
  • Cohesive Devices: Are linking words appropriate (neither over- nor under-used, no wrong linkers)?
  • Referencing: Are pronouns and data references clear and unambiguous?

**LEXICAL RESOURCE** – assess these 4 sub-categories:
  • Range: Is there sufficient variety of trend vocabulary (surge, plummet, stabilise, fluctuate, plateau)?
  • Word Choice: Are words precise and appropriate for data description (sharp, dramatic, gradual, marginal)?
  • Register: Is the tone consistently formal, objective, and academic (no contractions, opinions)?
  • Spelling: Are all words spelled correctly throughout the report?

**GRAMMATICAL RANGE & ACCURACY** – assess these 3 sub-categories:
  • Accuracy: Are all grammatical structures correct (agreement, tense, articles, prepositions, word order)?
  • Punctuation: Is punctuation (commas, full stops, capitals, sentence boundaries) correct throughout?
  • Complexity & Range: Is there adequate variety of grammatical structures (subordinate clauses, comparatives, non-finite forms)?

Return ONLY a valid JSON object exactly matching this structure:
{{
  "Task Response": {{
    "overall_score": 0.0,
    "overall_justification": "...",
    "sub_categories": {{
      "Data Accuracy":     {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Coverage":          {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Overview/Position": {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Comparison":        {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Development":       {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Relevance":         {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}}
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
      "Accuracy":          {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Punctuation":       {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},
      "Complexity & Range":{{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}}
    }}
  }}
}}
"""
        else:
            user_prompt = f"""
REPORT PROMPT: {report_prompt}

{chart_data_context}

USER REPORT:
{user_answer}

Your two tasks:

1. Write an OVERALL SUMMARY of exactly 5 to 7 complete sentences. (Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy). For each criterion mention one key strength AND one primary weakness in plain language. Do NOT include any band scores or numeric grades in the summary — focus on qualitative observations only.
2. Score each criterion (overall_score + overall_justification) and each sub-category (score only — no narratives needed from you).

BREVITY RULE: overall_justification for each criterion: max 35 words.

**TASK RESPONSE** – sub-categories: Data Accuracy, Coverage, Overview/Position, Comparison, Development, Relevance
**COHERENCE & COHESION** – sub-categories: Structure, Paragraphing, Progression, Cohesive Devices, Referencing
**LEXICAL RESOURCE** – sub-categories: Range, Word Choice, Register, Spelling
**GRAMMATICAL RANGE & ACCURACY** – sub-categories: Accuracy, Punctuation, Complexity & Range

Return ONLY a valid JSON object exactly matching this structure:
{{
  "overall_summary": "5-7 sentence overall assessment covering all four criteria with specific strengths and weaknesses for each...",
  "Task Response": {{
    "overall_score": 0.0,
    "overall_justification": "...",
    "sub_categories": {{
      "Data Accuracy":     {{"score": 0.0}},
      "Coverage":          {{"score": 0.0}},
      "Overview/Position": {{"score": 0.0}},
      "Comparison":        {{"score": 0.0}},
      "Development":       {{"score": 0.0}},
      "Relevance":         {{"score": 0.0}}
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
      "Accuracy":          {{"score": 0.0}},
      "Punctuation":       {{"score": 0.0}},
      "Complexity & Range":{{"score": 0.0}}
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

    # ------------------------------------------------------------------
    # MODEL A: PER-CRITERION SCORING WITH NARRATIVES
    # ------------------------------------------------------------------

    async def _perform_scoring_for_criteria_subset(
        self,
        user_answer: str,
        report_prompt: str,
        chart_data_context: str,
        criteria_subset: List[str],
        model: str = SCORING_MODEL_A,
    ) -> dict:
        system_prompt = f"""You are a senior IELTS examiner with 20+ years of experience in Academic Writing Task 1 (Report).
You are scoring with {model}.

Provide detailed band scores (0.5 increments from 1.0 to 9.0) for:
1. Each MAIN criterion (listed below)
2. Each SUB-CATEGORY within each criterion

Be SPECIFIC and DETAILED. Provide concrete evidence and quotes from the report.
Your scores must REFLECT THE ACTUAL QUALITY of the report — do not default to the middle.

OFFICIAL IELTS BAND CALIBRATION FOR ACADEMIC REPORT (Task 1) — use these as concrete anchors:

TASK RESPONSE
  Band 9 : All key features fully covered with accurate data; clear, effective overview; precise comparisons; fully relevant
  Band 8 : Key features covered; minor gaps in detail or comparison; overview present and clear; data mostly accurate
  Band 7 : Main features covered; adequate data support and comparisons; overview present but may lack precision
  Band 6 : Task addressed but some features inadequately covered; limited comparison
  Band 5 : Partially addresses task; overview vague or missing; limited comparisons
  Band 4 : Only minimally addresses task; no clear overview; little data cited

COHERENCE & COHESION
  Band 9 : Seamless logical organisation; perfect paragraphing; all referencing unambiguous
  Band 8 : Well-organised; occasional minor cohesion fault; paragraphing effective
  Band 7 : Clear progression; range of cohesive devices with occasional over/under-use
  Band 6 : Arranges information coherently but cohesive devices mechanical or limited
  Band 5 : Some organisation; over/under-use of linkers; wrong linkers present
  Band 4 : Limited organisation; connectives wrong or missing; random data ordering

LEXICAL RESOURCE
  Band 9 : Full range of data and trend vocabulary; precise collocations; no errors
  Band 8 : Wide data vocabulary; sophisticated trend terms; minor errors
  Band 7 : Sufficient range; some less-common data vocabulary; occasional errors
  Band 6 : Adequate trend vocabulary; noticeable repetition; errors in word choice
  Band 5 : Limited range; repetition of basic trend words; errors may cause strain
  Band 4 : Very limited trend vocabulary; errors in basic data terminology

GRAMMATICAL RANGE & ACCURACY
  Band 9 : Wide range of structures; rare errors; complex sentences managed naturally
  Band 8 : Variety of structures; majority error-free; occasional slips in complex sentences
  Band 7 : Mix of structures; errors occur but rarely affect communication
  Band 6 : Mix of simple and complex; errors do not impede communication
  Band 5 : Limited range; frequent grammatical errors; may cause difficulty for reader
  Band 4 : Very limited range; errors dominate; communication frequently impeded

IMPORTANT: Score what you actually read. Do NOT converge toward 6.0–7.0 unless genuinely warranted."""

        _criteria_desc: Dict[str, str] = {
            "Task Response": """**TASK RESPONSE** – assess these 6 sub-categories:
  • Data Accuracy: Are numerical claims accurate against the reference data (semantic comparison, ±15% tolerance)?
  • Coverage: Are ALL key features mentioned (peaks, troughs, outliers, major changes)?
  • Overview/Position: Is a clear overview present summarising main trends? Is it consistent with the body?
  • Comparison: Are meaningful comparisons/contrasts made between categories, groups, or time periods?
  • Development: Are trend statements supported with appropriate quantitative evidence?
  • Relevance: Is all content drawn from the chart only (no opinions, causes, or external information)?""",
            "Coherence & Cohesion": """**COHERENCE & COHESION** – assess these 5 sub-categories:
  • Structure: Is the report properly organised (introduction, overview, body paragraphs)?
  • Paragraphing: Are paragraphs unified, with clear topic sentences for each data group?
  • Progression: Does data flow logically without random jumps between years/categories?
  • Cohesive Devices: Are linking words appropriate (neither over- nor under-used, no wrong linkers)?
  • Referencing: Are pronouns and data references clear and unambiguous?""",
            "Lexical Resource": """**LEXICAL RESOURCE** – assess these 4 sub-categories:
  • Range: Is there sufficient variety of trend vocabulary (surge, plummet, stabilise, fluctuate, plateau)?
  • Word Choice: Are words precise and appropriate for data description (sharp, dramatic, gradual, marginal)?
  • Register: Is the tone consistently formal, objective, and academic (no contractions, opinions)?
  • Spelling: Are all words spelled correctly throughout the report?""",
            "Grammatical Range & Accuracy": """**GRAMMATICAL RANGE & ACCURACY** – assess these 3 sub-categories:
  • Accuracy: Are all grammatical structures correct (agreement, tense, articles, prepositions, word order)?
  • Punctuation: Is punctuation (commas, full stops, capitals, sentence boundaries) correct throughout?
  • Complexity & Range: Is there adequate variety of grammatical structures (subordinate clauses, comparatives, non-finite forms)?""",
        }

        _criteria_schema: Dict[str, str] = {
            "Task Response": (
                '  "Task Response": {{\n'
                '    "overall_score": 0.0,\n'
                '    "overall_justification": "...",\n'
                '    "sub_categories": {{\n'
                '      "Data Accuracy":     {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Coverage":          {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Overview/Position": {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Comparison":        {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Development":       {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Relevance":         {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}}\n'
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
                '      "Accuracy":          {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Punctuation":       {{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}},\n'
                '      "Complexity & Range":{{"score": 0.0, "strengths": "...", "weaknesses": "...", "evidence": "..."}}\n'
                '    }}\n'
                '  }}'
            ),
        }

        descriptions_block = "\n\n".join(_criteria_desc[c] for c in criteria_subset)
        schema_entries      = ",\n".join(_criteria_schema[c] for c in criteria_subset)

        user_prompt = f"""
REPORT PROMPT: {report_prompt}

{chart_data_context}

USER REPORT:
{user_answer}

Provide a holistic assessment. For each criterion and sub-category below,
give: score, strengths, weaknesses, and evidence (specific quotes from the report).

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
    # DUAL-ROUND AVERAGING (SIMPLE AVERAGE — NO MIN)
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # SUB-ITEM SCORING WITH RERANKER
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # MERGED FEEDBACK (exact Task 2 logic)
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # DETAILED FEEDBACK GENERATION
    # ------------------------------------------------------------------

    async def _generate_detailed_feedback(
        self,
        user_answer: str,
        report_prompt: str,
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

    # ------------------------------------------------------------------
    # REVISION
    # ------------------------------------------------------------------

    async def _generate_revision(
            self, user_answer: str, report_prompt: str, chart_data_context: str
        ) -> dict:
        system_prompt = "You are an expert IELTS examiner and accomplished academic writer specialising in Writing Task 1 (Academic Report)."
        user_prompt = f"""
    REPORT PROMPT: {report_prompt}

    {chart_data_context}

    ORIGINAL STUDENT REPORT:
    {user_answer}

    TASK: Edit the student's report in place to correct mistakes — do NOT rewrite it as a new report.
    Keep the same paragraph count and order whenever possible (intro → overview → body).
    Preserve the student's selected data points and comparisons; correct accuracy and language only.
    Apply targeted corrections in these areas:

    STRUCTURE (fix if broken; do not invent a wholly new outline):
    • Introduction: paraphrase the prompt and identify what the chart shows — not copy it verbatim
    • Overview: highlight 2–3 most significant trends/patterns with NO specific figures
    • Body: present specific data logically with precise comparisons
    • End with a brief objective wrap-up of the main ranking/pattern in the final body paragraph
      (Academic Task 1 must NOT use an opinion-style "In conclusion" paragraph)
    • Remove any opinions, predictions, or speculation — Task 1 must be fully objective

    CONTENT:
    • Correct any data the student misread or stated inaccurately
    • Add only essential omitted key figures from the chart context if needed for accuracy
    • Improve grouping of data where the student listed figures without logical organisation

    LANGUAGE:
    • Replace informal or imprecise vocabulary with academic data-reporting language
        (e.g. "went up a lot" → "increased sharply by X%", "was the biggest" → "accounted for the largest share")
    • Fix grammatical errors (tense, agreement, articles, prepositions)
    • Improve cohesive devices and sentence variety
    • Fix punctuation and spelling

    The improved report must be clearly stronger than the original.
    In revised_score_line, estimate a band at least 0.5 higher than a fair score for the original
    (0.5 increments, max 9.0). Do NOT default to 9.0 unless the revision truly merits it.

    For "key_improvements", list exactly 4 specific edits — each must reference
    what was wrong in the original and what was corrected in the revised version.
    Examples of good improvement entries:
    - "Introduction was a direct copy of the prompt — rewritten as a paraphrase identifying chart type and subject"
    - "Overview paragraph contained specific figures — removed data and replaced with general trend statements"
    - "Data in Body Paragraph 1 was listed chronologically without grouping — reorganised by category for clarity"
    - "Replaced vague comparator 'more than double' with precise figure: 'rose from 20% to 45%'"
    - "Removed speculative phrase 'this may be because' — Task 1 reports require objective description only"

    Return ONLY a valid JSON object:
    {{
    "revision": "The improved report text here — same structure as the student report, with corrections applied...",
    "revised_score_line": "Improved Report (Band X.X)",
    "word_count": 175,
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
    # VOCABULARY — 3 PARALLEL BATCHES
    # ------------------------------------------------------------------

    async def _generate_vocabulary_batch(
        self,
        user_answer: str,
        report_prompt: str,
        batch_number: int,
        category_focus: str,
        category_labels: List[str],
    ) -> List[dict]:
        vocab_system = (
            "You are an IELTS Data Vocabulary Enhancement Specialist. "
            "Your task is to provide targeted Band 8–9 vocabulary for IELTS Writing Task 1 Academic Reports. "
            "Respond only with a valid JSON object."
        )

        category_list_str = "\n".join(f"  - {c}" for c in category_labels)

        vocab_user = f"""
REPORT PROMPT: {report_prompt}
USER REPORT: {user_answer}

TASK: Generate EXACTLY 10 high-level vocabulary items from the following categories ONLY:
{category_list_str}

STRICT RULES:
1. Every item MUST fall into one of the categories listed above — use those exact category names.
2. Every item MUST be completely absent from the user's report.
3. Every item MUST be directly relevant to describing data trends, comparisons, and chart features.
4. Distribute items across ALL listed categories (do not concentrate on one category).
5. Each item must be at Band 8–9 level — sophisticated, precise, academic.

Return ONLY a valid JSON object:
{{
  "vocabulary_enhancements": [
    {{
      "word": "plummet",
      "type": "verb",
      "definition": "to fall or drop straight down at high speed",
      "example": "Sales plummeted in the third quarter, dropping from 500k to just 120k.",
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

    async def _generate_vocabulary(self, user_answer: str, report_prompt: str) -> dict:
        batch_configs = [
            {
                "batch_number": 1,
                "category_focus": "Trend Verbs & Trend Nouns",
                "category_labels": ["Trend Verbs", "Trend Nouns"],
            },
            {
                "batch_number": 2,
                "category_focus": "Adverbs of Degree & Data Adjectives",
                "category_labels": ["Adverbs of Degree", "Data Adjectives"],
            },
            {
                "batch_number": 3,
                "category_focus": "Comparison Phrases & Data Collocations",
                "category_labels": ["Comparison Phrases", "Data Collocations"],
            },
        ]

        batch_results = await asyncio.gather(*[
            self._generate_vocabulary_batch(
                user_answer, report_prompt,
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

    # ------------------------------------------------------------------
    # DATA STRUCTURE ANALYSIS (Argumentation — Task 1 adaptation)
    # ------------------------------------------------------------------

    async def _analyze_data_structure(
        self, user_answer: str, report_prompt: str, chart_data_context: str
    ) -> dict:
        structural = await self._analyze_data_structure_structural(user_answer, report_prompt, chart_data_context)
        analytical = await self._analyze_data_structure_analytical(user_answer, report_prompt, chart_data_context)
        return self._clean_authenticity_data({**structural, **analytical})

    async def _analyze_data_structure_structural(
        self, user_answer: str, report_prompt: str, chart_data_context: str
    ) -> dict:
        system_prompt = """You are an IELTS Task 1 Academic Report expert analyzing data structure and presentation quality.

Your task: Assess the structural architecture of the report — introduction paraphrase, data coverage map, and overview quality.

CRITICAL: You are NOT detecting grammar/vocabulary errors. Focus ONLY on:
1. Introduction structure (does it paraphrase the prompt correctly? identify chart type/period/units?)
2. Data coverage mapping (which features are covered vs. omitted? how strong is evidence quality?)
3. Overview quality (does it capture main trends without specific data?)

For IELTS Task 1 reports, strong structure has:
- Clear introduction that paraphrases (not copies) the prompt
- Overview identifying 2-3 most significant trends
- Grouped body paragraphs with precise data support
- Comparisons between categories where relevant
- Objective tone throughout — no opinions or causes"""

        user_prompt = f"""
REPORT PROMPT: {report_prompt}

{chart_data_context}

USER REPORT:
{user_answer}

Analyze the structural elements of this Academic Report:

════════════════════════════════════════════════════════════════
1. INTRODUCTION STRUCTURE ANALYSIS
════════════════════════════════════════════════════════════════

Analyze the introduction paragraph:

**Paraphrase Quality:**
- Does the introduction paraphrase (not copy) the prompt? (Good / Partial / Copied / Missing)
- Does it identify the chart type? (Yes / No)
- Does it identify the time period? (Yes / No)
- Does it identify the unit of measurement? (Yes / No)
- Quote the introduction if present.

**Chart Context:**
- Is context provided accurately? (Yes / Inaccurate / Missing)

**Overall Introduction Quality:** Rate 1-5 stars
**Recommendation:** How to improve the introduction

════════════════════════════════════════════════════════════════
2. DATA COVERAGE MAP
════════════════════════════════════════════════════════════════

For EACH main data series or category visible in the chart, identify:

**Data Series / Category:** What data group or trend is being tracked?

**Coverage Status:**
✓ Fully Covered — mentioned with specific data and context
~ Partially Covered — mentioned but data or context missing
✗ Missing — not mentioned at all

**Evidence Quality Rating (1-5 stars):**
★☆☆☆☆ = No data provided, just vague claim ("it increased")
★★☆☆☆ = Mentioned with approximate or generic figures
★★★☆☆ = Specific figure cited but limited context
★★★★☆ = Specific figure with comparison or time reference
★★★★★ = Precise figure, comparison, time reference, and trend direction

**Missing Elements:** What specific data or comparison would strengthen coverage?

**Overall Coverage Score:** Rate 1.0–9.0 (IELTS band equivalent)

**Actionable Recommendation:** How to improve data coverage for this series

════════════════════════════════════════════════════════════════
3. OVERVIEW QUALITY ANALYSIS
════════════════════════════════════════════════════════════════

Analyze the overview paragraph:

**Present:** Is there a dedicated overview paragraph? (Yes / No — embedded in intro / Missing)

**Main Trends Captured:** Does it identify the 2-3 most significant patterns? (Yes / Partial / No)

**Specific Data in Overview:** Does it (incorrectly) include specific figures in the overview? (Yes — bad / No — good)

**Consistency:** Is the overview consistent with the body paragraph details? (Yes / Contradicts body)

**Overall Overview Quality:** Rate 1-5 stars

**Recommendation:** How to improve the overview

════════════════════════════════════════════════════════════════

Return ONLY valid JSON matching this exact structure:

{{
  "introduction_analysis": {{
    "paraphrase_quality": "Good",
    "identifies_chart_type": true,
    "identifies_time_period": true,
    "identifies_units": false,
    "introduction_quote": "The graph illustrates the number of men and women...",
    "context_accuracy": "Yes",
    "overall_quality_stars": 4,
    "strengths": ["Clearly identifies chart type and time period"],
    "weaknesses": ["Does not mention unit of measurement (thousands)"],
    "recommendation": "Add unit information: 'The chart illustrates, in thousands, the number of...'"
  }},
  "data_coverage_map": [
    {{
      "data_series": "Men Part-time Education",
      "coverage_status": "Partially Covered",
      "evidence_quality_stars": 3,
      "evidence_quality_text": "Specific figure cited but peak year not mentioned",
      "missing_elements": ["Peak value in 1970/71", "Comparison with Women Part-time"],
      "coverage_score": 6.0,
      "recommendation": "State the 1970/71 peak of 1000k and note that it was overtaken by women by 1990/91."
    }}
  ],
  "overview_analysis": {{
    "overview_present": "Yes",
    "main_trends_captured": "Partial",
    "specific_data_in_overview": false,
    "consistent_with_body": true,
    "overall_quality_stars": 3,
    "strengths": ["Correctly identifies upward trend for women"],
    "weaknesses": ["Does not mention the crossover point between men and women"],
    "recommendation": "Add that women's part-time participation overtook men's by the final period."
  }}
}}

REMEMBER: Return ONLY the JSON object, nothing else.
"""
        raw = await self._call_ai(
            system_prompt, user_prompt,
            task_name="DataStructureStructural",
            model=ARGUMENTATION_MODEL,
            json_mode=True,
        )
        result = self._clean_json(raw)
        logger.info(f"  → Data structure structural complete: "
                    f"{len(result.get('data_coverage_map', []))} data series mapped, "
                    f"Intro {result.get('introduction_analysis', {}).get('overall_quality_stars', 'N/A')}★, "
                    f"Overview {result.get('overview_analysis', {}).get('overall_quality_stars', 'N/A')}★")
        return result

    async def _analyze_data_structure_analytical(
        self, user_answer: str, report_prompt: str, chart_data_context: str
    ) -> dict:
        system_prompt = """You are an IELTS Task 1 Academic Report expert analyzing data selection quality, task alignment, and report authenticity.

Your task: Assess the analytical depth and authenticity of the report's data presentation.

CRITICAL: You are NOT detecting grammar/vocabulary errors. Focus ONLY on:
1. Data selection quality (are the most significant features chosen?)
2. Task alignment verification (does the report match the chart type and requirements?)
3. Authenticity check (memorized IELTS report phrases, over-generalizations, non-native patterns)

For IELTS Task 1 reports, strong analytical writing has:
- Selective focus on most significant features (not listing every data point)
- Meaningful comparisons between categories
- Correct chart type interpretation
- Authentic, non-templated expression
- Objective tone with no speculation or opinions"""

        user_prompt = f"""
REPORT PROMPT: {report_prompt}

{chart_data_context}

USER REPORT:
{user_answer}

Conduct an analytical and authenticity assessment of this Academic Report:

════════════════════════════════════════════════════════════════
4. DATA SELECTION QUALITY ANALYSIS
════════════════════════════════════════════════════════════════

**Selectivity Band:** Overall data selection quality (1.0–9.0)
**Selectivity Level:** Listing all data / Selective but incomplete / Well-selected

**Metrics:**
- Unsupported trend claims count (trend mentioned without data)
- Meaningful comparisons count (explicit comparative language)
- Countertrend noted (Yes / No — does the report mention any trend that went against the overall pattern?)
- Data precision quality (Vague / Adequate / Precise)

**Evidence:**
Provide 1-2 examples showing:
- Vague claim → What specific version would look like
- Missing comparison → What comparison should have been made

════════════════════════════════════════════════════════════════
5. TASK ALIGNMENT CHECK
════════════════════════════════════════════════════════════════

**Chart Type Identified:**
What type of chart is this?
- Line graph (trends over time)
- Bar chart (comparisons across categories)
- Pie chart (proportional breakdown)
- Table (multiple data points)
- Process diagram (stages/steps)
- Map (geographical change)
- Mixed charts (two charts together)

**Student's Interpretation:**
Did the student correctly identify and respond to the chart type?

**Required Elements Checklist:**
For line graphs/bar charts over time:
  - Overview of main trend? (Complete / Incomplete / Missing)
  - Comparison between series? (Complete / Incomplete / Missing)
  - Specific data cited? (Complete / Incomplete / Missing)
  - Objective tone maintained? (Yes / Partially / No)

**Coverage Balance:**
What percentage of the report covers each data series?
Are some series over-covered while others are ignored?

**Misinterpretation Warning:**
If chart type or requirements were misunderstood, explain the error clearly.

════════════════════════════════════════════════════════════════
6. AUTHENTICITY & PITFALL DETECTION
════════════════════════════════════════════════════════════════

For each category below, follow this two-step process:
  STEP 1 — Find it: Locate the EXACT phrase in the report and quote it verbatim.
  STEP 2 — Fix it: Write a concrete replacement (never leave the fix field empty).
  SKIP any item where you cannot complete BOTH steps.

**Memorized IELTS Report Phrases** (max 5):
Common examples: "The graph shows", "As can be seen from the graph", "It is clear that",
"Overall, it can be seen that", "As illustrated in the graph", "According to the graph"
  STEP 1 → "phrase": copy the exact words from the report
  STEP 2 → "suggestion": write a specific, authentic replacement
  If you can only do one step, OMIT the item.

**Over-generalizations**:
Unsupported absolute claims about data ("all countries increased dramatically")
  STEP 1 → "phrase": copy the exact words from the report
  STEP 2 → "suggestion": write a SHORT replacement PHRASE only (3-8 words max).
  If you can only do one step, OMIT the item.

**Mother Tongue Interference**:
Non-native data description patterns (wrong prepositions with data, incorrect tense patterns)
  STEP 1 → "phrase": copy the EXACT problematic phrase as the student WROTE it
  STEP 2 → "suggestion": write the corrected native-English version
  If you can only do one step, OMIT the item.

**Clichés & Overused Report Expressions**:
Examples: "experienced a dramatic increase", "witnessed a significant decline", "saw a sharp rise"
  STEP 1 → "phrase": copy the exact cliché from the report
  STEP 2 → "suggestion": write a fresh, specific alternative
  If you can only do one step, OMIT the item.

**Formulaic vs Natural Ratio:**
Estimate % of report that sounds templated vs authentic (0-100%). Target for Band 8+: 70%+ natural.

════════════════════════════════════════════════════════════════

PRE-OUTPUT VALIDATION — before returning JSON, check every item:
  ✓ memorized_phrases:          "phrase" non-empty AND "suggestion" non-empty
  ✓ over_generalizations:       "phrase" non-empty AND "suggestion" non-empty
  ✓ mother_tongue_interference: "phrase" non-empty AND "suggestion" non-empty
  ✓ cliches_detected:           "phrase" non-empty AND "suggestion" non-empty
  Remove any item that fails either check.

Return ONLY valid JSON matching this exact structure:

{{
  "data_selection_quality": {{
    "selectivity_band": 6.5,
    "selectivity_level": "Selective but incomplete",
    "unsupported_trend_claims_count": 2,
    "unsupported_claims_examples": ["Women increased significantly (no figure given)"],
    "meaningful_comparisons_count": 3,
    "countertrend_noted": false,
    "countertrend_note": "The decline in men's part-time education was not contrasted against women's rise",
    "data_precision_quality": "Adequate",
    "depth_comparison": {{
      "vague_example": "Women's part-time numbers increased significantly.",
      "improved_example": "Women's part-time participation surged from 700k in 1970/71 to 1100k in 1990/91, overtaking the male figure."
    }}
  }},
  "task_alignment": {{
    "chart_type_identified": "Line graph (trends over time)",
    "chart_type_student_treated_as": "Bar chart comparison",
    "correctly_interpreted": true,
    "required_elements": [
      {{
        "element": "Overview of main trend",
        "status": "Complete",
        "coverage_percentage": 15,
        "note": "Overview paragraph present with key trends"
      }}
    ],
    "balance_score": 7.0,
    "balance_explanation": "Coverage is broadly balanced across data series with slight over-emphasis on men's figures",
    "misinterpretation_warning": null,
    "task_type_guide": "For line graphs: Para 1 intro (paraphrase), Para 2 overview (main trends, no data), Para 3-4 body (specific data with comparisons)"
  }},
  "authenticity": {{
    "memorized_phrases": [
      {{
        "phrase": "As can be seen from the graph",
        "location": "Introduction, Sentence 1",
        "issue": "Overused IELTS report template opener",
        "suggestion": "The graph illustrates trends in further education participation"
      }}
    ],
    "over_generalizations": [
      {{
        "phrase": "all categories increased dramatically",
        "location": "Overview, Sentence 2",
        "issue": "Not all categories increased — men's part-time declined",
        "suggestion": "most categories rose, with the exception of"
      }}
    ],
    "mother_tongue_interference": [
      {{
        "pattern": "Incorrect preposition with data verb",
        "location": "Body Paragraph 1, Sentence 3",
        "phrase": "increased with 200 thousand",
        "suggestion": "increased by 200 thousand",
        "explanation": "English uses 'by' to indicate the amount of change, not 'with'"
      }}
    ],
    "cliches_detected": [
      {{
        "phrase": "experienced a dramatic increase",
        "location": "Body Paragraph 2, Sentence 1",
        "issue": "Overused IELTS report cliché",
        "suggestion": "surged from X to Y over the period"
      }}
    ],
    "formulaic_vs_natural_percentage": 40,
    "authenticity_score": 60,
    "authenticity_note": "40% of report uses memorised IELTS templates. For Band 8+, aim for 70%+ natural, authentic academic expression."
  }},
  "overall_summary": "Report demonstrates adequate data selection with clear structural organisation but relies heavily on formulaic language. The overview captures main trends but lacks the crossover comparison between men and women. Body paragraphs provide reasonable data support but miss the opportunity to make precise comparisons at each time point."
}}

REMEMBER: Return ONLY the JSON object, nothing else.
"""
        raw = await self._call_ai(
            system_prompt, user_prompt,
            task_name="DataStructureAnalytical",
            model=ARGUMENTATION_MODEL,
            json_mode=True,
        )
        result = self._clean_json(raw)
        logger.info(f"  → Data structure analytical complete: "
                    f"selectivity band {result.get('data_selection_quality', {}).get('selectivity_band', 'N/A')}, "
                    f"task correctly interpreted: {result.get('task_alignment', {}).get('correctly_interpreted', 'N/A')}, "
                    f"authenticity score: {result.get('authenticity', {}).get('authenticity_score', 'N/A')}")
        return result

    # ------------------------------------------------------------------
    # FLOW & LOGIC ANALYSIS (Task 1 adaptation) — 3 parallel splits
    # ------------------------------------------------------------------

    async def _analyze_flow_macro(
        self, user_answer: str, report_prompt: str, chart_data_context: str
    ) -> dict:
        system_prompt = """You are an IELTS Task 1 coherence expert analyzing paragraph-level flow and logical connections in Academic Reports.

Your task: Assess logical progression and structural coherence at the paragraph level.

CRITICAL: You are NOT detecting individual cohesive device errors. Focus ONLY on:
1. Paragraph-to-paragraph flow strength (transition quality between data groups)
2. Logical coherence (data jumps, sequence errors, grouping failures)
3. Cohesion patterns (pronoun clarity, device variety, topic sentence effectiveness for data)
4. Paragraph unity (each paragraph covers one data group consistently)

Strong data report coherence features:
- Smooth transitions between data groups or time periods
- Logical grouping of related data series
- Clear pronoun references for data series
- Varied cohesive devices (not mechanical repetition)
- Strong topic sentences that signal the data category being discussed

Weak data report coherence features:
- Abrupt paragraph shifts between unrelated data series
- Random time-order jumps (2010 → 1990 → 2005)
- Ambiguous pronouns ('it', 'this') with multiple possible data antecedents
- Overuse of same connectors
- Vague topic sentences that don't signal the data category"""

        user_prompt = f"""
REPORT PROMPT: {report_prompt}

{chart_data_context}

USER REPORT:
{user_answer}

Conduct a macro-level flow and logic analysis of this Academic Report:

════════════════════════════════════════════════════════════════
1. PARAGRAPH-TO-PARAGRAPH FLOW ANALYSIS
════════════════════════════════════════════════════════════════

For EACH transition (Intro→Overview, Overview→Body1, Body1→Body2, Body2→Conclusion):

**Flow Strength:** 0-100% (how smoothly does one paragraph connect to the next?)
0-30%: Abrupt, jarring shift in data focus
30-60%: Weak connection between data groups
60-80%: Adequate transition
80-100%: Smooth, natural data progression

**Quality:** Smooth / Adequate / Weak / Abrupt

**Reason:** WHY is it smooth or abrupt?

**Logical Gap (if present):** What missing link would improve the connection?

**Transition Device Present:** Yes/No

**Suggestion:** If weak, how to improve?

════════════════════════════════════════════════════════════════
2. LOGICAL COHERENCE & DATA SEQUENCING
════════════════════════════════════════════════════════════════

Identify any logical sequencing errors or data grouping failures:

**Common Task 1 Coherence Issues:**
- Temporal Jumping: Describing 2010, then 1990, then 2005 without reason
- Category Mixing: Combining unrelated data series in one paragraph
- Omission Gap: Describing some years but skipping significant periods
- Comparison Placement: Comparisons made at wrong point in the report

For each issue found:
- Type of issue, location, exact problematic text, explanation, impact, suggested revision

════════════════════════════════════════════════════════════════
3. COHESION QUALITY MATRIX
════════════════════════════════════════════════════════════════

**A. Pronoun Reference Clarity:**
For pronouns like "it", "this", "they", "these", "the former", "the latter":
- Location, clarity (Clear / Ambiguous), what it refers to, possible referents, suggested fix

**B. Cohesive Device Analysis:**
- Overall variety score (0-100%)
- Devices used (list)
- Devices overused (if any used 3+ times)
- Device categories underused (comparison, contrast, temporal, exemplification)

**C. Topic Sentence Effectiveness:**
For each body paragraph:
- The topic sentence text
- Effectiveness rating (1-5 stars)
- Note on why effective/ineffective
- Suggestion for improvement (if needed)

════════════════════════════════════════════════════════════════
4. PARAGRAPH UNITY ANALYSIS
════════════════════════════════════════════════════════════════

For each body paragraph:
- Unity score (0-100%): Does it maintain single data focus?
- Main data group of the paragraph
- Off-topic drift detected? (Yes/No)
- Drift details (which sentence introduces unrelated data)
- Recommendation for improvement

════════════════════════════════════════════════════════════════

Return ONLY valid JSON matching this exact structure:

{{
  "paragraph_flow_analysis": [
    {{
      "from": "Introduction",
      "to": "Overview",
      "flow_strength": 85,
      "quality": "Smooth",
      "reason": "Introduction sets up the chart context; overview naturally follows with main trends",
      "transition_device_present": false,
      "transition_text": null,
      "logical_gap": null,
      "suggestion": null
    }}
  ],
  "logical_fallacies": [
    {{
      "type": "Temporal Jumping",
      "location": "Body Paragraph 2, Sentences 2-3",
      "problematic_text": "In 2000 the figure was 50. In 1980 it was 30. By 2010 it reached 70.",
      "explanation": "Non-sequential time order disrupts the reader's ability to track the trend",
      "impact": "Reader cannot follow the progression of the trend",
      "suggested_revision": "Describe years chronologically: 1980 (30), 2000 (50), 2010 (70)"
    }}
  ],
  "cohesion_quality": {{
    "pronoun_reference_analysis": [
      {{
        "pronoun": "it",
        "location": "Body Para 2, Sentence 3",
        "context": "Both men and women increased, but it was lower in 2000.",
        "clarity": "Ambiguous",
        "possible_referents": ["men's figure", "women's figure"],
        "issue": "Reader cannot determine which data series 'it' refers to",
        "suggested_fix": "men's part-time figure was lower in 2000",
        "severity": "High"
      }}
    ],
    "cohesive_device_variety": 65,
    "variety_rating": "Adequate but could improve",
    "devices_used": ["However", "Furthermore", "In contrast"],
    "devices_overused": [
      {{
        "device": "Furthermore",
        "count": 4,
        "issue": "Used to start 4 consecutive data sentences — becomes mechanical",
        "suggestion": "Vary with: Additionally, Moreover, In addition, Also"
      }}
    ],
    "devices_underused": ["Temporal markers (from X to Y, between X and Y, over the period)"],
    "variety_improvement_tip": "Add temporal connectors to signal data time points more clearly.",
    "topic_sentences": [
      {{
        "paragraph": "Body Paragraph 1",
        "paragraph_number": 3,
        "sentence": "The first thing to notice is that men had higher numbers.",
        "effectiveness_rating": 2,
        "effectiveness_note": "Vague — does not signal data category (which category?) or time period",
        "strengths": [],
        "weaknesses": ["Vague opener", "No data category named"],
        "suggestion": "Replace with: 'Regarding part-time education, men consistently outnumbered women throughout the period.'"
      }}
    ]
  }},
  "paragraph_unity": [
    {{
      "paragraph": "Body Paragraph 1",
      "paragraph_number": 3,
      "unity_score": 95,
      "unity_rating": "Excellent",
      "main_idea": "Men's part-time education trends",
      "drift_detected": false,
      "drift_details": null,
      "recommendation": "Maintain this single-focus structure throughout."
    }}
  ],
  "overall_flow_score": 68,
  "flow_summary": "Report shows adequate coherence with clear data grouping. Main weaknesses: ambiguous pronoun 'it' and overuse of 'Furthermore'."
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
        self, user_answer: str, report_prompt: str, chart_data_context: str
    ) -> dict:
        system_prompt = """You are an IELTS Task 1 coherence expert analyzing sentence-level flow within data report paragraphs.

Your task: Assess internal sentence-to-sentence transitions in each body paragraph.

OUTPUT EFFICIENCY RULE (strictly follow to keep response concise):
- For transitions with quality "Smooth" (flow_strength >= 70): output ONLY flow_strength and quality.
- For transitions with quality "Adequate", "Weak", or "Abrupt" (flow_strength < 70): output the full object including reason, cohesive_link_present, cohesive_link, and suggestion.
This rule is mandatory. Do not add extra fields to smooth transitions."""

        user_prompt = f"""
REPORT PROMPT: {report_prompt}

{chart_data_context}

USER REPORT:
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
      "paragraph_number": 3,
      "overall_internal_flow": 75,
      "sentence_transitions": [
        {{
          "from_sentence": "S2",
          "to_sentence": "S3",
          "flow_strength": 40,
          "quality": "Weak",
          "reason": "Data jumps from men's figures to women's figures without a comparative bridge",
          "cohesive_link_present": false,
          "cohesive_link": null,
          "suggestion": "Add: 'By contrast, women's part-time figures...' to bridge the comparison"
        }}
      ],
      "internal_flow_summary": "Generally smooth with one weak S2→S3 transition where a comparative bridge is missing"
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
        self, user_answer: str, report_prompt: str, chart_data_context: str
    ) -> dict:
        system_prompt = """You are an IELTS Task 1 register and tone expert.

Your task: Assess academic register and objectivity consistency across the Academic Report.

Focus ONLY on:
- Per-paragraph formality scores
- Informal language hotspots (exact quote + formal replacement)
- Opinion / subjective language intrusions (I think, it is surprising that)
- Tone shift detection

CRITICAL RULE for informal_hotspots: Every item MUST have BOTH:
  "informal_text" → the EXACT informal word/phrase from the report (verbatim)
  "formal_alternative" → a concrete formal replacement
Omit any item where you cannot provide both fields."""

        user_prompt = f"""
REPORT PROMPT: {report_prompt}

{chart_data_context}

USER REPORT:
{user_answer}

Assess register, tone, and objectivity consistency:

**Per-Paragraph Formality Scores:**
Rate each paragraph 0-100%.
100% = Fully academic, objective, no contractions, no opinions
50-99% = Mostly academic with minor lapses
0-49% = Informal/subjective language dominates
BREVITY RULE: "note" field: max 10 words per paragraph.

**Informal Language Hotspots:**
For each informal instance provide BOTH:
- "informal_text": EXACT word/phrase from the report (verbatim — never empty)
- "formal_alternative": concrete formal replacement (never empty)
Skip any item where you cannot provide both fields.
BREVITY RULE: "issue" field: max 10 words.

**Opinion / Subjective Language:**
Flag any instance of personal viewpoint or subjective language:
- "I think", "I believe", "In my opinion"
- "surprisingly", "unfortunately", "it is sad that"
- Causal speculation: "because people preferred", "due to economic reasons"

**Tone Shift Detection:**
One sentence max flagging any paragraph where objectivity drops.

Return ONLY valid JSON:

{{
  "register_consistency": {{
    "overall_score": 85,
    "consistency_rating": "Mostly consistent with minor lapses",
    "paragraph_scores": [
      {{
        "paragraph": "Body Paragraph 2",
        "formality_percentage": 60,
        "note": "Opinion phrase and contraction detected",
        "issues": ["I think", "it's"]
      }}
    ],
    "informal_hotspots": [
      {{
        "location": "Body Para 2, Sentence 3",
        "informal_text": "it's clear that",
        "issue": "Contraction in academic report",
        "formal_alternative": "it is evident that"
      }}
    ],
    "opinion_intrusions": [
      {{
        "location": "Body Para 1, Sentence 4",
        "text": "This is probably because more women entered the workforce",
        "issue": "Speculative causal claim — not visible in chart",
        "formal_alternative": "Remove entirely — causes not shown in the chart"
      }}
    ],
    "tone_shift_warning": "Body Paragraph 2 drops to 60% formality. Maintain objective, academic register throughout.",
    "academic_tone_advice": "Replace contractions, opinions, and causal speculation with objective data description."
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
    # DATA CLEANERS
    # ------------------------------------------------------------------

    def _clean_authenticity_data(self, data_structure_data: dict) -> dict:
        import copy
        data = copy.deepcopy(data_structure_data)
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
        auth["mother_tongue_interference"] = [
            i for i in (auth.get("mother_tongue_interference") or [])
            if _both_nonempty(i, "phrase", "suggestion")
        ]
        auth["cliches_detected"] = [
            i for i in (auth.get("cliches_detected") or [])
            if _both_nonempty(i, "phrase", "suggestion")
        ]
        data["authenticity"] = auth
        return data

    def _clean_flow_data(self, flow_data: dict) -> dict:
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

    # ------------------------------------------------------------------
    # GRAMMAR ANALYSIS
    # ------------------------------------------------------------------

    async def _generate_grammar_analysis(
        self, error_data: dict, report_prompt: str, user_answer: str,
        pre_fetched_ai_result: Optional[str] = None
    ) -> dict:
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
                "Wide range of grammatical structures for data description",
                "Complex subordinate clauses for comparison (while, whereas, although)",
                "Accurate past simple tense for historical data",
                "Appropriate use of comparative and superlative forms",
                "Consistent subject-verb agreement with data series",
            ]
        else:
            if any(e.get("error_id") in ("tense_aspect",) for e in grammar_errors):
                used_structures.append("Various tense forms with some tense inconsistency")
            if any(e.get("error_id") == "subject_verb_agreement" for e in grammar_errors):
                used_structures.append("Subject-verb agreement in simple sentences")
            if "Complexity & Range" not in errors_by_subcat:
                used_structures.append("Complex sentences with subordinators (although, while, whereas)")
                used_structures.append("Comparative structures and non-finite clauses")
            if not used_structures:
                used_structures = ["Basic sentence structures present"]

        enrichments: List[dict] = []

        if "Accuracy" in errors_by_subcat:
            acc_errors  = errors_by_subcat["Accuracy"]
            error_types = {e.get("error_id") for e in acc_errors}
            if "subject_verb_agreement" in error_types:
                enrichments.append({
                    "structure": "Subject-Verb Agreement with Data Series (e.g., 'the figures show', 'the number was')",
                    "benefit":   "Prevents basic agreement errors which lower accuracy scores and distract the reader.",
                    "example_context": f"Error found: '{acc_errors[0].get('original_text', '')}'. Practise with data-series subjects."
                })
            if "tense_aspect" in error_types:
                enrichments.append({
                    "structure": "Past Simple Tense for Historical Data (e.g., 'rose', 'fell', 'remained', 'stood at')",
                    "benefit":   "Shows correct tense control relative to the time period shown in the chart.",
                    "example_context": "All verbs describing past chart data must use past simple: 'The figure rose to 850k in 1990'."
                })
            if "preposition" in error_types:
                enrichments.append({
                    "structure": "Data Preposition Collocations (e.g., 'increased BY 20%', 'rose TO 500k', 'fell FROM 300 TO 200')",
                    "benefit":   "Shows fine-grained control over data language and is expected at high bands.",
                    "example_context": "Use 'by' for change amount, 'to' for end value, 'from/to' for range."
                })

        if "Punctuation" in errors_by_subcat:
            punct_sample = next(
                (e.get("original_text") for e in errors_by_subcat["Punctuation"] if e.get("original_text")),
                None,
            )
            enrichments.append({
                "structure": "Correct Punctuation in Comparative Clauses (e.g., comma after 'While X increased,' before main clause)",
                "benefit":   "Improves readability and prevents mis-parsing of complex comparative data statements.",
                "example_context": f"Error found: '{punct_sample}'." if punct_sample else
                    "Use a comma after introductory adverbials and after subordinate clauses ('While coal rose, ...')."
            })

        advanced_always = [
            {
                "structure": "Complex Comparative Sentences (e.g., 'While X increased, Y decreased', 'Whereas A rose steadily, B fluctuated')",
                "benefit":   "Adds formal variety and links data series logically, boosting both cohesion and grammatical complexity.",
                "example_context": "While men's part-time education declined overall, women's in the same category surged significantly."
            },
            {
                "structure": "Relative Clauses for Data Annotation (e.g., 'which represented the highest figure', 'where the value stood at')",
                "benefit":   "Allows additional data detail to be embedded within a sentence without disrupting the main clause.",
                "example_context": "Women's part-time figures reached 1100k by 1990/91, which represented the highest value in the entire dataset."
            },
            {
                "structure": "Non-finite Participial Phrases (e.g., 'reaching a peak of 1100k in 1990/91', 'having declined sharply')",
                "benefit":   "Adds grammatical variety and allows compact description of trends without repeating the subject.",
                "example_context": "Women in part-time education surged dramatically, reaching a peak of 1100k by 1990/91."
            },
        ]
        existing_keys = {e["structure"] for e in enrichments}
        for adv in advanced_always:
            if adv["structure"] not in existing_keys:
                enrichments.append(adv)

        # Cap at exactly 3
        enrichments = enrichments[:3]

        total = len(grammar_errors)
        if total == 0:
            summary = "Excellent grammatical control with no errors detected. Continue using a wide range of structures for comparing trends while maintaining full accuracy."
        elif total <= 3:
            summary = f"Good grammatical control with {total} error(s). Primary focus areas: {', '.join(errors_by_subcat.keys())}."
        else:
            summary = f"{total} grammatical errors identified. Key areas requiring review: {', '.join(errors_by_subcat.keys())}."

        tips: List[str] = []
        if "Accuracy" in errors_by_subcat:
            tips.append("Practise data preposition collocations: 'increase BY', 'rise TO', 'fall FROM X TO Y', 'stand AT'.")
            tips.append("Create reference notes for past simple tense forms of trend verbs (rose, fell, remained, stood, reached, peaked).")
        if "Punctuation" in errors_by_subcat:
            tips.append("Conduct dedicated punctuation passes: check commas after 'While/Although/Whereas' clauses and sentence boundaries.")
        if "Complexity & Range" in errors_by_subcat:
            tips.append("Practise writing complex comparative sentences linking two data series in a single sentence using 'while' or 'whereas'.")
        if not tips:
            tips = [
                "Vary sentence openings to demonstrate grammatical range in the report.",
                "Use a mix of simple, compound, and complex comparative structures.",
                "Include advanced structures (relative clauses, participial phrases, nominalisations).",
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
            grammar_system = (
                "You are an expert IELTS Grammar Specialist focusing on Grammatical Range and Accuracy in Academic Reports (Task 1). "
                "Respond only with a valid JSON object."
            )
            grammar_user = f"""
REPORT PROMPT: {report_prompt}
USER REPORT: {user_answer}

TASK: Analyse the grammar in this Academic Report deeply and provide a structured report.

**1. DETECTED STRUCTURES**
List the grammatical structures the student ACTUALLY used in the text. Be specific.

**2. SUGGESTED ENRICHMENTS — EXACTLY 3 ITEMS**
Identify exactly 3 specific grammar structures missing or underutilised that would reach Band 8+.
You MUST provide exactly 3 items — no more, no less.

CRITICAL INSTRUCTIONS FOR ENRICHMENTS:
- "structure": Include a simple example in parentheses for non-technical users.
  e.g. "Complex Comparative Clauses (e.g., using 'while X increased, Y decreased')"
- "benefit": Explain why it helps for data reporting.
- "example_context": Provide a specific example using the ACTUAL content of this report.

**3. STRENGTHS & WEAKNESSES**
Write a concise summary analysing the grammatical performance in the context of data description.

**4. CRITICAL EXPERT TIPS**
Provide specific, actionable tips to enhance the grammatical quality of the report.

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
        self, result: dict, exam_name: str, report_prompt: str, chart_type: str, user_answer: str
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
                    "task_type":               "Academic Report (Task 1)",
                    "chart_type":              chart_type,
                    "prompt":                  report_prompt,
                    "user_answer":             user_answer,
                    "grading_system_version":  "6.0-TASK1-FULL-TASK2-ARCHITECTURE",
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
                "revision":         result.get("revision_data", {}),
                "vocabulary":       result.get("vocabulary", []),
                "grammar":          result.get("grammar", {}),
                "data_structure":   result.get("data_structure_analysis", {}),
                "flow_logic":       result.get("flow_logic_analysis", {}),
            }
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2, ensure_ascii=False)
            logger.info(f"Report saved: {filepath}")
            return str(filepath)
        except Exception as e:
            logger.error(f"Failed to save report: {str(e)}")
            return None

    # ------------------------------------------------------------------
    # MAIN GRADING ENTRY POINT (v6.0 — FULL TASK2 ARCHITECTURE)
    # ------------------------------------------------------------------

    def _resolve_chart_reference(
        self,
        report_prompt: str,
        chart_type: str,
        chart_svg: Optional[str] = None,
        chart_image: Optional[str] = None,
    ) -> str:
        """Build the reference-data block used for data-accuracy checking.

        Priority (most reliable first):
          1. Deterministic parse of the question bank's chart_svg markup
          2. Vision extraction from a rasterized PNG (legacy fallback)
          3. Synthetic / prompt-embedded SVG hint (last resort)
        """
        if chart_svg:
            try:
                from chart_svg_parser import parse_chart_svg_reference
                parsed = parse_chart_svg_reference(chart_svg)
                if parsed:
                    logger.info("[SVG] Reference data computed exactly from chart SVG (%d chars)", len(parsed))
                    return parsed
                logger.warning("[SVG] Could not parse chart SVG — will try vision fallback if available")
            except Exception as e:
                logger.warning("[SVG] Chart SVG parsing failed (%s) — will try vision fallback if available", e)

        if chart_image:
            return None  # caller runs async vision extraction

        gen = self._generate_chart_reference(report_prompt, chart_type)
        return gen["text"]

    async def grade_report(
        self,
        user_answer: str,
        report_prompt: str,
        chart_type: str,
        exam_name: str = "IELTS Writing Task 1",
        chart_image: Optional[str] = None,
        chart_svg: Optional[str] = None,
    ) -> dict:
        """
        v6.0 – FULL TASK 2 ARCHITECTURE FOR TASK 1 ACADEMIC REPORT

        Architecture:
          - 4x error detection (per-criterion, parallel)
          - 4x Scoring Model A (per-criterion with narratives, parallel)
          - 1x Scoring Model B (all criteria + summary only)
          - 1x Revision
          - 1x Grammar AI prefetch (exactly 3 enrichments)
          - 2x Data Structure Analysis (structural + analytical, parallel)
          - 3x Flow & Logic Analysis (macro + sentence + register, parallel)
          - 3x Vocabulary batches (Trend Verbs/Nouns, Adverbs/Adjectives, Comparison Phrases, parallel)

        Total: 19 parallel API calls in mega-batch.

        Scoring:
          - Model A: 4 split calls (one per criterion), narratives + scores
          - Model B: all criteria, scores + summary only (no narratives)
          - Final score: simple average of Model A and Model B
          - Feedback: Task 2 merged feedback logic using averaged sub-category scores + error penalties
        """
        user_answer = normalize_paragraph_breaks(user_answer or "")
        try:
            logger.info("=" * 80)
            logger.info("IELTS TASK 1 REPORT GRADING v6.0 – FULL TASK2 ARCHITECTURE")
            logger.info(f"  Scoring models  : A={SCORING_MODEL_A} (4x split calls + narratives)  B={SCORING_MODEL_B} (summary only)")
            logger.info(f"  Error detection : {ERROR_DETECTION_MODEL} @ temp=dynamic(gpt4:{ERROR_DETECTION_TEMPERATURE_GPT4}/gpt5:1.0)")
            logger.info(f"  Grammar AI      : {GRAMMAR_MODEL} (prefetched, exactly 3 enrichments)")
            logger.info("  Vocab           : 3 parallel batches (10 items each = 30 total)")
            logger.info("  Data Structure  : 2 parallel calls (structural + analytical)")
            logger.info("  Flow & Logic    : 3 parallel calls (macro + sentence + register)")
            logger.info("=" * 80)

            # Generate chart reference data for data-accuracy checking.
            # Prefer exact SVG parsing (deterministic); fall back to vision OCR on
            # a rasterized PNG only when SVG parsing is unavailable.
            chart_data_context = self._resolve_chart_reference(
                report_prompt, chart_type, chart_svg=chart_svg, chart_image=chart_image
            )
            if chart_data_context is None and chart_image:
                logger.info("[IMAGE] SVG parse unavailable — extracting chart data via vision (fallback)...")
                gen = await self._extract_chart_data_from_image(chart_image, report_prompt, chart_type)
                chart_data_context = gen["text"]
                _extracted_prompt = (gen.get("extracted_prompt") or "").strip()
                if _extracted_prompt and not _extracted_prompt.upper().startswith("N/A") and not report_prompt.strip():
                    report_prompt = _extracted_prompt
                    logger.info("[IMAGE] report_prompt updated from vision extraction")

            # Grammar AI prefetch prompt (exactly 3 enrichments)
            grammar_system = (
                "You are an expert IELTS Grammar Specialist focusing on Grammatical Range and Accuracy in Academic Reports (Task 1). "
                "Respond only with a valid JSON object."
            )
            grammar_user = f"""
REPORT PROMPT: {report_prompt}
USER REPORT: {user_answer}

TASK: Analyse the grammar in this Academic Report deeply and provide a structured report.

**1. DETECTED STRUCTURES**
List the grammatical structures the student ACTUALLY used in the text. Be specific.

**2. SUGGESTED ENRICHMENTS — EXACTLY 3 ITEMS**
Identify exactly 3 specific grammar structures missing or underutilised that would reach Band 8+.
You MUST provide exactly 3 items — no more, no less.

CRITICAL INSTRUCTIONS FOR ENRICHMENTS:
- "structure": Include a simple example in parentheses for non-technical users.
  e.g. "Complex Comparative Clauses (e.g., using 'while X increased, Y decreased')"
- "benefit": Explain why it helps for data reporting.
- "example_context": Provide a specific example using the ACTUAL content of this report.

**3. STRENGTHS & WEAKNESSES**
Write a concise summary analysing the grammatical performance in the context of data description.

**4. CRITICAL EXPERT TIPS**
Provide specific, actionable tips to enhance the grammatical quality of the report.

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

            logger.info("\n[MEGA-BATCH] Launching 19 parallel API calls...")

            mega_batch_results = await asyncio.gather(
                # Error detection (4 calls) — indices 0-3
                self._detect_errors_for_criterion(user_answer, report_prompt, chart_data_context, "Task Response"),
                self._detect_errors_for_criterion(user_answer, report_prompt, chart_data_context, "Coherence & Cohesion"),
                self._detect_errors_for_criterion(user_answer, report_prompt, chart_data_context, "Lexical Resource"),
                self._detect_errors_for_criterion(user_answer, report_prompt, chart_data_context, "Grammatical Range & Accuracy"),
                # Scoring Model A — 4 single-criterion calls (narratives) — indices 4-7
                self._perform_scoring_for_criteria_subset(user_answer, report_prompt, chart_data_context, ["Task Response"], SCORING_MODEL_A),
                self._perform_scoring_for_criteria_subset(user_answer, report_prompt, chart_data_context, ["Coherence & Cohesion"], SCORING_MODEL_A),
                self._perform_scoring_for_criteria_subset(user_answer, report_prompt, chart_data_context, ["Lexical Resource"], SCORING_MODEL_A),
                self._perform_scoring_for_criteria_subset(user_answer, report_prompt, chart_data_context, ["Grammatical Range & Accuracy"], SCORING_MODEL_A),
                # Scoring Model B — all criteria + summary — index 8
                self._perform_detailed_independent_scoring(user_answer, report_prompt, chart_data_context, SCORING_MODEL_B),
                # Revision — index 9
                self._generate_revision(user_answer, report_prompt, chart_data_context),
                # Grammar AI prefetch — index 10
                self._call_ai(grammar_system, grammar_user, task_name="GrammarPrefetch", model=GRAMMAR_MODEL, json_mode=True),
                # Data Structure Analysis — 2 parallel calls — indices 11-12
                self._analyze_data_structure_structural(user_answer, report_prompt, chart_data_context),
                self._analyze_data_structure_analytical(user_answer, report_prompt, chart_data_context),
                # Flow & Logic — 3 parallel calls — indices 13-15
                self._analyze_flow_macro(user_answer, report_prompt, chart_data_context),
                self._analyze_flow_sentence(user_answer, report_prompt, chart_data_context),
                self._analyze_flow_register(user_answer, report_prompt, chart_data_context),
                # Vocabulary — 3 parallel batches — indices 16-18
                self._generate_vocabulary_batch(user_answer, report_prompt, 1, "Trend Verbs & Trend Nouns", ["Trend Verbs", "Trend Nouns"]),
                self._generate_vocabulary_batch(user_answer, report_prompt, 2, "Adverbs of Degree & Data Adjectives", ["Adverbs of Degree", "Data Adjectives"]),
                self._generate_vocabulary_batch(user_answer, report_prompt, 3, "Comparison Phrases & Data Collocations", ["Comparison Phrases", "Data Collocations"]),
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
            scoring_round_b          = mega_batch_results[8]
            revision_data            = mega_batch_results[9]
            grammar_ai_raw           = mega_batch_results[10]
            data_structure_data      = self._clean_authenticity_data({**mega_batch_results[11], **mega_batch_results[12]})
            flow_logic_raw           = {**mega_batch_results[13], **mega_batch_results[14], **mega_batch_results[15]}
            flow_logic_data          = self._clean_flow_data(flow_logic_raw)

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

            all_errors: List[dict] = tr_errors + cc_errors + lr_errors + gra_errors
            logger.info(f"  → MEGA-BATCH complete. Total errors: {len(all_errors)}")

            error_summary = self._build_error_summary(all_errors)
            error_data = {"errors": all_errors, "error_summary": error_summary}

            logger.info("  → Averaging dual scoring rounds (simple average)...")
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
                error_data, report_prompt, user_answer,
                pre_fetched_ai_result=grammar_ai_raw,
            )
            logger.info("  → Grammar complete.")

            logger.info("\n[CPU] Generating detailed feedback (no API call)...")
            feedback_result = await self._generate_detailed_feedback(
                user_answer, report_prompt, error_data, final_scores, averaged_scoring
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

                "revision_data":          revision_data,
                "vocabulary":             vocabulary_data.get("vocabulary_enhancements", []),
                "grammar":                grammar_data,

                "data_structure_analysis": data_structure_data,
                "flow_logic_analysis":     flow_logic_data,

                "score": str(final_scores["overall_band"]),
            }

            report_path = self._save_comprehensive_report(
                result, exam_name, report_prompt, chart_type, user_answer
            )
            if report_path:
                result["report_saved_to"] = report_path

            logger.info("\n" + "=" * 80)
            logger.info("TASK 1 REPORT GRADING COMPLETE")
            logger.info(f"  Overall Band  : {final_scores['overall_band']}")
            logger.info(f"  Errors found  : {len(all_errors)}")
            logger.info(f"  Vocabulary    : {len(merged_vocab)} items (3 batches)")
            logger.info(f"  Architecture  : 19-call mega-batch | Scoring-A×4 | DataStruct×2 | Flow×3 | Vocab×3")
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
    parser.add_argument("--chart-type", type=str, required=True)
    parser.add_argument("--user-answer", type=str, required=True)
    parser.add_argument("--chart-image", type=str, default=None,
                        help="Base64-encoded chart screenshot (optional).")
    parser.add_argument("--chart-image-file", type=str, default=None,
                        help="Path to a PNG/JPEG chart screenshot (vision fallback only).")
    parser.add_argument("--chart-svg-file", type=str, default=None,
                        help="Path to the chart's SVG markup (preferred — exact reference data).")
    args = parser.parse_args()

    chart_svg_value = None
    if args.chart_svg_file:
        with open(args.chart_svg_file, "r", encoding="utf-8") as _f:
            chart_svg_value = _f.read()

    # Resolve chart image: file path takes priority over inline base64
    chart_image_value = args.chart_image
    if args.chart_image_file:
        with open(args.chart_image_file, 'rb') as _f:
            _img_bytes = _f.read()
        # Detect MIME type from magic bytes for correct data URL
        if _img_bytes[:8] == b'\x89PNG\r\n\x1a\n':
            _mime = 'image/png'
        elif _img_bytes[:3] == b'\xff\xd8\xff':
            _mime = 'image/jpeg'
        elif _img_bytes[:4] == b'RIFF' and _img_bytes[8:12] == b'WEBP':
            _mime = 'image/webp'
        else:
            _mime = 'image/jpeg'
        chart_image_value = f"data:{_mime};base64,{base64.b64encode(_img_bytes).decode()}"

    api_key = (os.environ.get("OPENAI_API_KEY") or "").strip()
    if not api_key:
        logger.error(
            "OPENAI_API_KEY is not set. Put it in .env at the project root "
            "(see .env.example) or export OPENAI_API_KEY."
        )
        sys.exit(1)

    grader = Task1ReportGrader(api_key=api_key)
    result = asyncio.run(grader.grade_report(
        user_answer=args.user_answer,
        report_prompt=args.prompt,
        chart_type=args.chart_type,
        exam_name=args.exam_name,
        chart_image=chart_image_value,
        chart_svg=chart_svg_value,
    ))
    print(json.dumps(result))