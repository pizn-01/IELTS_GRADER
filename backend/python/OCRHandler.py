#!/usr/bin/env python3
import argparse
import json
import sys
import os
import base64
from contextlib import redirect_stdout
import warnings
from pathlib import Path

# --- CONFIGURATION ---
# Set to True for vision OCR via OpenAI (OCR_VISION_MODEL, default gpt-5.2)
USE_OPENAI = True


def _load_repo_dotenv() -> None:
    try:
        from dotenv import load_dotenv
    except ImportError:
        return
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")


_load_repo_dotenv()
# Set OPENAI_API_KEY in project-root .env (see .env.example) or export it.
OPENAI_API_KEY = (os.getenv("OPENAI_API_KEY") or "").strip()
# ---------------------

# Try to suppress warnings if the module is available
try:
    import warnings
    warnings.filterwarnings("ignore")
except Exception:
    warnings = None

def encode_file(file_path):
    """Encodes file to base64 for API transmission."""
    with open(file_path, "rb") as file:
        return base64.b64encode(file.read()).decode('utf-8')

def detect_file_type_by_content(file_path):
    """Detects file type by reading magic bytes from file content."""
    try:
        with open(file_path, 'rb') as f:
            header = f.read(16)  # Read first 16 bytes
            
        # Check for common file signatures (magic bytes)
        # Images
        if header.startswith(b'\xff\xd8\xff'):
            return 'image', 'image/jpeg'
        elif header.startswith(b'\x89PNG\r\n\x1a\n'):
            return 'image', 'image/png'
        elif header.startswith(b'GIF87a') or header.startswith(b'GIF89a'):
            return 'image', 'image/gif'
        elif header.startswith(b'BM'):
            return 'image', 'image/bmp'
        elif header.startswith(b'RIFF') and header[8:12] == b'WEBP':
            return 'image', 'image/webp'
        elif header.startswith(b'II*\x00') or header.startswith(b'MM\x00*'):
            return 'image', 'image/tiff'
        # PDF
        elif header.startswith(b'%PDF'):
            return 'pdf', 'application/pdf'
        # Word documents
        elif header.startswith(b'PK\x03\x04'):
            # Could be docx (which is a zip file) or other zip-based formats
            # Check for word document specific markers
            try:
                import zipfile
                with zipfile.ZipFile(file_path, 'r') as zip_ref:
                    # Check for Word document structure
                    if 'word/document.xml' in zip_ref.namelist():
                        return 'word', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            except:
                pass
            return 'unknown', None
        elif header.startswith(b'\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1'):
            # Old MS Office format (.doc)
            return 'word', 'application/msword'
        else:
            return 'unknown', None
            
    except Exception as e:
        return 'unknown', None

def get_file_type(file_path):
    """Determines file type - first by content, then by extension as fallback."""
    # Try to detect by content first
    file_type, mime_type = detect_file_type_by_content(file_path)
    
    if file_type != 'unknown':
        return file_type, mime_type
    
    # Fallback to extension-based detection
    ext = Path(file_path).suffix.lower()
    if ext in ['.jpg', '.jpeg']:
        return 'image', 'image/jpeg'
    elif ext == '.png':
        return 'image', 'image/png'
    elif ext == '.gif':
        return 'image', 'image/gif'
    elif ext == '.bmp':
        return 'image', 'image/bmp'
    elif ext == '.webp':
        return 'image', 'image/webp'
    elif ext in ['.tiff', '.tif']:
        return 'image', 'image/tiff'
    elif ext == '.pdf':
        return 'pdf', 'application/pdf'
    elif ext == '.docx':
        return 'word', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    elif ext == '.doc':
        return 'word', 'application/msword'
    else:
        return 'unknown', None

def extract_text_from_pdf(file_path):
    """Extract text from PDF using PyPDF2."""
    try:
        import PyPDF2
        text_content = []
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    text_content.append(text)
        joined = "\n\n".join(text_content).strip()
        # Scanned PDFs have no text layer — PyPDF2 cannot OCR them.
        if len(joined) < 20:
            return (
                "Error: This PDF has little or no extractable text (it may be a scan). "
                "Please upload a clear photo (JPG/PNG) of the page instead."
            )
        return joined
    except ImportError:
        return "Error: PyPDF2 library not installed. Install with: pip install PyPDF2"
    except Exception as e:
        return f"Error extracting PDF text: {str(e)}"

def extract_text_from_word(file_path):
    """Extract text from Word document using python-docx."""
    try:
        import docx
        doc = docx.Document(file_path)
        full_text = []
        for para in doc.paragraphs:
            if para.text.strip():
                full_text.append(para.text)
        return '\n\n'.join(full_text)
    except ImportError:
        return "Error: python-docx library not installed. Install with: pip install python-docx"
    except Exception as e:
        return f"Error extracting Word document text: {str(e)}"

# Vision OCR model — aligned with Task1ReportGrader chart vision.
OCR_VISION_MODEL = (os.getenv("OCR_VISION_MODEL") or "gpt-5.2").strip()


def _is_model_refusal(text: str) -> bool:
    """True when the vision model returned a safety refusal instead of transcription."""
    t = (text or "").strip().lower()
    if not t:
        return False
    refusal_markers = (
        "i'm sorry, i can't assist",
        "i am sorry, i can't assist",
        "i can't assist with that",
        "i cannot assist with that",
        "i'm unable to assist",
        "i am unable to assist",
        "i can't help with that",
        "i cannot help with that",
        "as an ai",
        "i must refuse",
    )
    # Short refusal-only replies (not a long essay that happens to mention one phrase)
    if len(t) < 220 and any(m in t for m in refusal_markers):
        return True
    return False


def _vision_ocr_kwargs(model: str) -> dict:
    """Token/temperature args for chat completions (gpt-5 uses max_completion_tokens)."""
    if model.startswith("gpt-5"):
        return {"temperature": 1.0, "max_completion_tokens": 4000}
    return {"temperature": 0, "max_tokens": 2000}


def extract_with_openai(file_path):
    """Transcribe images via vision OCR; extract PDFs/Word docs directly."""
    try:
        file_type, mime_type = get_file_type(file_path)
        
        if file_type == 'image':
            from openai import OpenAI
            if not OPENAI_API_KEY:
                return "Error: OPENAI_API_KEY not set. Please set the OPENAI_API_KEY environment variable."

            client = OpenAI(api_key=OPENAI_API_KEY)
            base64_file = encode_file(file_path)
            model = OCR_VISION_MODEL
            call_kwargs = _vision_ocr_kwargs(model)

            # Explicit exam-practice framing reduces false safety refusals on handwritten/
            # photographed student work and published IELTS prompts.
            system_msg = (
                "You are an OCR transcription engine for IELTS writing practice. "
                "Your only job is to copy visible text from exam questions and student "
                "answers exactly. Never refuse legitimate exam or study material. "
                "Never add commentary, apologies, or explanations."
            )
            user_text = (
                "This image is an IELTS Writing practice upload (question prompt and/or "
                "student essay, letter, or Task 1 report). Transcribe every visible word "
                "exactly as written. Preserve paragraph breaks and line structure. "
                "Return ONLY the transcribed text with no preface."
            )

            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_msg},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_text},
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:{mime_type};base64,{base64_file}"},
                            },
                        ],
                    },
                ],
                **call_kwargs,
            )
            content = (response.choices[0].message.content or "").strip()
            if _is_model_refusal(content):
                # One retry with a stricter OCR-only instruction
                retry = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": system_msg},
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": (
                                        "OCR only. Copy all readable English text from this exam photo. "
                                        "Do not refuse. Output the raw transcription only."
                                    ),
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:{mime_type};base64,{base64_file}"},
                                },
                            ],
                        },
                    ],
                    **call_kwargs,
                )
                content = (retry.choices[0].message.content or "").strip()
            if _is_model_refusal(content):
                return (
                    "Error: Could not read text from this image. "
                    "Try a clearer photo, or paste the text manually."
                )
            return content
            
        elif file_type == 'pdf':
            # Handle PDFs by extracting text directly
            return extract_text_from_pdf(file_path)
            
        elif file_type == 'word':
            # Handle Word documents by extracting text directly
            return extract_text_from_word(file_path)
            
        else:
            # Unknown file type
            ext = Path(file_path).suffix.lower()
            return f"Error: Unable to determine file type for: {file_path}. Extension: '{ext}' (if any). Supported types: images (JPG, PNG, GIF, BMP, WEBP, TIFF), PDFs, Word documents (DOC, DOCX)"
            
    except Exception as e:
        return f"Processing Error: {str(e)}"

def extract_with_local(file_path):
    """Local fallback if OpenAI is disabled."""
    try:
        file_type, mime_type = get_file_type(file_path)
        
        if file_type == 'image':
            # Use EasyOCR for images
            import easyocr
            reader = easyocr.Reader(['en'], verbose=False)
            result = reader.readtext(file_path, detail=0, paragraph=True)
            return "\n\n".join(result)
            
        elif file_type == 'pdf':
            # Use PyPDF2 for PDFs
            return extract_text_from_pdf(file_path)
                
        elif file_type == 'word':
            # Use python-docx for Word documents
            return extract_text_from_word(file_path)
            
        else:
            # Unknown file type
            ext = Path(file_path).suffix.lower()
            return f"Error: Unable to determine file type for: {file_path}. Extension: '{ext}' (if any). Supported types: images (JPG, PNG, GIF, BMP, WEBP, TIFF), PDFs, Word documents (DOC, DOCX)"
            
    except Exception as e:
        return f"Local processing error: {str(e)}"

def main():
    parser = argparse.ArgumentParser(description='Extract text from images, PDFs, and Word documents')
    parser.add_argument("--image_path", required=True, help="Path to the file (image, PDF, or Word document)")
    args = parser.parse_args()

    # Validate file exists
    if not os.path.exists(args.image_path):
        print(json.dumps({"text": f"Error: File not found: {args.image_path}"}))
        return

    extracted_text = ""

    try:
        # Suppress noisy libraries safely without closing sys.stdout
        with open(os.devnull, "w") as devnull, redirect_stdout(devnull):
            if USE_OPENAI:
                extracted_text = extract_with_openai(args.image_path)
            else:
                extracted_text = extract_with_local(args.image_path)
    except Exception as e:
        extracted_text = f"Processing Error: {str(e)}"

    # Output ONLY the clean JSON for server.js to read
    print(json.dumps({"text": extracted_text}))

if __name__ == "__main__":
    main()