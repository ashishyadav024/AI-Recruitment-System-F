"""
Automated Test Suite for Resume Upload & Text Extraction
Tests:
1. Sample text PDF (page by page, header/footer normalization)
2. Sample DOCX (paragraphs and tables)
3. Scanned/Image PDF (detects lack of extractable text and provides clear guidance)
4. Empty file (rejected with clear message)
5. Corrupted file / invalid magic bytes (friendly error, never crashes)
6. File > 5MB (rejected with 413/size error)
7. Short text (<200 chars) warning validation
8. FastAPI /api/resume/extract HTTP endpoint via TestClient
"""

import os
import sys
import io

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import pymupdf
import docx
import asyncio
import json
from fastapi import UploadFile
from api.resume_routes import extract_resume
from services.resume_extractor import (
    process_resume_file,
    detect_file_type,
    clean_and_normalize_text,
    extract_from_pdf,
    extract_from_docx,
    extract_from_txt,
    ResumeExtractionError,
    MAX_FILE_SIZE_BYTES
)


class AssertRaises:
    """Lightweight context manager replacing pytest.raises"""
    def __init__(self, expected_exc):
        self.expected_exc = expected_exc
        self.value = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            raise AssertionError(f"Expected {self.expected_exc.__name__} but no exception was raised.")
        if not issubclass(exc_type, self.expected_exc):
            return False
        self.value = exc_val
        return True


# ─────────────────────────────────────────────────────────────
# Helper functions to generate mock file contents in memory
# ─────────────────────────────────────────────────────────────

def create_sample_text_pdf(text: str) -> bytes:
    """Creates a valid PDF containing text using PyMuPDF"""
    doc = pymupdf.open()
    page1 = doc.new_page()
    page1.insert_text((50, 72), "John Doe - Senior Software Engineer\nHeader: Software Engineering Resume", fontsize=11)
    page1.insert_text((50, 110), text[:len(text)//2], fontsize=10)
    page1.insert_text((50, 750), "Page 1 of 2 - Confidential", fontsize=9)

    page2 = doc.new_page()
    page2.insert_text((50, 72), "John Doe - Senior Software Engineer\nHeader: Software Engineering Resume", fontsize=11)
    page2.insert_text((50, 110), text[len(text)//2:], fontsize=10)
    page2.insert_text((50, 750), "Page 1 of 2 - Confidential", fontsize=9)

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def create_scanned_image_pdf() -> bytes:
    """Creates a PDF containing an image but NO extractable text (scanned PDF simulation)"""
    doc = pymupdf.open()
    page = doc.new_page()
    # Create a small 100x100 RGB image pixmap and insert it
    pix = pymupdf.Pixmap(pymupdf.csRGB, (0, 0, 100, 100), False)
    pix.clear_with(200)  # light gray
    img_bytes = pix.tobytes("png")
    page.insert_image(pymupdf.Rect(50, 50, 300, 300), stream=img_bytes)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def create_sample_docx(paragraphs: list[str], table_rows: list[list[str]]) -> bytes:
    """Creates a valid DOCX with paragraphs and tables using python-docx"""
    doc = docx.Document()
    doc.add_heading("Jane Smith - Principal AI Engineer", 0)
    for p in paragraphs:
        doc.add_paragraph(p)

    if table_rows:
        table = doc.add_table(rows=len(table_rows), cols=len(table_rows[0]))
        for r_idx, row in enumerate(table_rows):
            for c_idx, val in enumerate(row):
                table.rows[r_idx].cells[c_idx].text = val

    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


SAMPLE_RESUME_TEXT = """
SUMMARY:
Experienced Senior Full-Stack Engineer with 7+ years developing distributed microservices,
high-throughput REST/GraphQL APIs, and modern responsive React/Next.js frontend applications.
Proven track record architecting cloud solutions on AWS and Google Cloud Platform.

TECHNICAL SKILLS:
- Languages: Python, TypeScript, JavaScript, Go, SQL
- Frontend: React, Redux Toolkit, TailwindCSS, Vite, HTML5, WebSockets
- Backend: FastAPI, Flask, Node.js, Express, Docker, Kubernetes
- Databases: PostgreSQL, MongoDB, Redis, Elasticsearch
- System Design: Microservices, Event-Driven Architecture, CI/CD pipelines

PROFESSIONAL EXPERIENCE:
Tech Solutions Inc. - Lead Engineer (2021 - Present)
- Architected high-availability real-time streaming pipeline processing 10M+ daily events.
- Reduced API p99 latency from 350ms to 45ms through distributed Redis caching and query indexing.
- Mentored 8 junior and mid-level software engineers across engineering and code review best practices.

EDUCATION:
B.S. in Computer Science - University of Technology, 2017
"""


# ─────────────────────────────────────────────────────────────
# Test Cases
# ─────────────────────────────────────────────────────────────

def test_1_sample_text_pdf_extraction():
    """Verify that PyMuPDF extracts page-by-page clean text from a standard PDF"""
    pdf_bytes = create_sample_text_pdf(SAMPLE_RESUME_TEXT)
    assert pdf_bytes.startswith(b"%PDF-"), "Magic bytes must start with %PDF-"

    result = process_resume_file("jane_doe_resume.pdf", pdf_bytes)

    assert result["success"] is True
    assert result["file_type"] == "pdf"
    assert result["char_count"] >= 200
    assert result["is_valid"] is True
    assert "Senior Full-Stack Engineer" in result["extracted_text"]
    assert "Tech Solutions Inc." in result["extracted_text"]
    print("✅ Test 1 Passed: Text PDF extraction successful with valid character count.")


def test_2_sample_docx_extraction():
    """Verify python-docx extracts paragraphs and tables cleanly"""
    paragraphs = [
        "Experienced Cloud Architect specializing in distributed systems, Kubernetes, and enterprise microservices.",
        "Built resilient event-driven architectures with Apache Kafka, FastAPI, and PostgreSQL databases."
    ]
    tables = [
        ["Skill Category", "Technologies", "Proficiency"],
        ["Backend", "Python, FastAPI, Go", "Expert"],
        ["Cloud", "AWS, GCP, Terraform", "Advanced"]
    ]
    docx_bytes = create_sample_docx(paragraphs, tables)
    assert docx_bytes.startswith(b"PK\x03\x04"), "DOCX magic bytes must match ZIP/OpenXML"

    result = process_resume_file("cloud_architect.docx", docx_bytes)

    assert result["success"] is True
    assert result["file_type"] == "docx"
    assert "Experienced Cloud Architect" in result["extracted_text"]
    assert "Backend | Python, FastAPI, Go | Expert" in result["extracted_text"]
    assert "Cloud | AWS, GCP, Terraform | Advanced" in result["extracted_text"]
    print("✅ Test 2 Passed: DOCX paragraph and table extraction successful.")


def test_3_scanned_image_pdf_detection():
    """Verify that a PDF containing only images and no text is clearly flagged as a scanned PDF"""
    scanned_bytes = create_scanned_image_pdf()

    with AssertRaises(ResumeExtractionError) as exc_info:
        process_resume_file("scanned_receipt.pdf", scanned_bytes)

    assert "scanned image" in exc_info.value.message.lower()
    assert "text-based pdf" in exc_info.value.message.lower()
    print(f"✅ Test 3 Passed: Scanned PDF correctly flagged: '{exc_info.value.message}'")


def test_4_empty_file_handling():
    """Verify empty file is caught and rejected gracefully with clear error"""
    with AssertRaises(ResumeExtractionError) as exc_info:
        process_resume_file("empty.pdf", b"")

    assert "empty" in exc_info.value.message.lower()

    with AssertRaises(ResumeExtractionError) as exc_info_docx:
        process_resume_file("empty.docx", b"")
    assert "empty" in exc_info_docx.value.message.lower()
    print("✅ Test 4 Passed: Empty files rejected with clear message.")


def test_5_corrupted_file_and_invalid_magic_bytes():
    """Verify corrupted files or fake extensions do not crash the server"""
    # 1. Fake PDF with random binary
    fake_pdf = b"This is plain text with a .pdf extension"
    with AssertRaises(ResumeExtractionError) as exc_pdf:
        process_resume_file("fake.pdf", fake_pdf)
    assert "Missing standard PDF header" in exc_pdf.value.message or "Invalid PDF" in exc_pdf.value.message

    # 2. Corrupted PDF header followed by garbage
    corrupted_pdf = b"%PDF-1.4 garbage corrupted body that cannot parse \x00\x00\xff\xfe"
    with AssertRaises(ResumeExtractionError) as exc_corrupt:
        process_resume_file("corrupted.pdf", corrupted_pdf)
    assert "Corrupted PDF" in exc_corrupt.value.message or "Unable to read" in exc_corrupt.value.message

    # 3. Fake DOCX with random text
    fake_docx = b"Not a real docx zip archive"
    with AssertRaises(ResumeExtractionError) as exc_docx:
        process_resume_file("fake.docx", fake_docx)
    assert "Missing standard Office OpenXML header" in exc_docx.value.message or "Invalid DOCX" in exc_docx.value.message

    print("✅ Test 5 Passed: Corrupted and spoofed files handled safely without crashes.")


def test_6_file_size_limit():
    """Verify files > 5MB are rejected with 413 error"""
    large_content = b"%PDF-" + (b"A" * (MAX_FILE_SIZE_BYTES + 1024))
    with AssertRaises(ResumeExtractionError) as exc_info:
        process_resume_file("large.pdf", large_content)

    assert exc_info.value.status_code == 413
    assert "too large" in exc_info.value.message.lower()
    print("✅ Test 6 Passed: Large files (>5MB) rejected with status code 413.")


def test_7_short_text_warning():
    """Verify extraction under 200 characters flags warning and sets is_valid=False"""
    short_text = "Hi, my name is Alex. I write code in Python."  # ~44 chars
    short_pdf = create_sample_text_pdf(short_text)

    result = process_resume_file("short_resume.pdf", short_pdf)
    assert result["success"] is True
    assert result["is_valid"] is False
    assert result["warning"] is not None
    assert "very short" in result["warning"].lower()
    assert result["char_count"] < 200
    print(f"✅ Test 7 Passed: Short text flagged with warning: '{result['warning']}'")


def test_8_api_endpoint_extract_pdf():
    """Verify POST /api/resume/extract returns clean JSON via FastAPI route handler"""
    pdf_bytes = create_sample_text_pdf(SAMPLE_RESUME_TEXT)
    upload_file = UploadFile(filename="candidate_resume.pdf", file=io.BytesIO(pdf_bytes))

    result = asyncio.run(extract_resume(upload_file))

    assert isinstance(result, dict)
    assert result["success"] is True
    assert result["file_type"] == "pdf"
    assert result["is_valid"] is True
    assert result["char_count"] >= 200
    assert "Senior Full-Stack Engineer" in result["extracted_text"]
    assert "file_path" in result
    assert os.path.exists(os.path.join(os.path.dirname(__file__), result["file_path"]))
    print("✅ Test 8 Passed: POST /api/resume/extract route returned valid JSON with stored file path.")


def test_9_api_endpoint_error_handling():
    """Verify POST /api/resume/extract returns friendly error on scanned PDF"""
    scanned_bytes = create_scanned_image_pdf()
    upload_file = UploadFile(filename="scanned_resume.pdf", file=io.BytesIO(scanned_bytes))

    response = asyncio.run(extract_resume(upload_file))

    assert response.status_code == 400
    data = json.loads(response.body.decode())
    assert data["success"] is False
    assert "scanned image" in data["detail"].lower()
    print("✅ Test 9 Passed: API error response is friendly and informative (400 Scanned PDF).")


if __name__ == "__main__":
    print("\n🚀 Running Resume Upload & Text Extraction Tests...\n")
    test_1_sample_text_pdf_extraction()
    test_2_sample_docx_extraction()
    test_3_scanned_image_pdf_detection()
    test_4_empty_file_handling()
    test_5_corrupted_file_and_invalid_magic_bytes()
    test_6_file_size_limit()
    test_7_short_text_warning()
    test_8_api_endpoint_extract_pdf()
    test_9_api_endpoint_error_handling()
    print("\n🎉 ALL 9 RESUME EXTRACTION TESTS PASSED PERFECTLY!\n")
