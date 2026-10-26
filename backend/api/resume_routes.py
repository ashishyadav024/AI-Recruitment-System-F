"""
Resume API Routes
Provides endpoints for resume upload, extraction, and original file retrieval.
"""

import os
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from services.resume_extractor import (
    process_resume_file,
    ResumeExtractionError,
    UPLOAD_DIR
)

logger = logging.getLogger(__name__)

resume_router = APIRouter(prefix="/api/resume", tags=["Resume"])


@resume_router.post("/extract")
async def extract_resume(file: UploadFile = File(...)):
    """
    Accepts multipart upload of a resume file (.pdf, .docx, .txt).
    Extracts text, validates quality, and stores the original file.
    """
    logger.info(f"📥 Received resume extraction request for file: {file.filename}")
    try:
        content = await file.read()
        filename = file.filename or "uploaded_resume"
        result = process_resume_file(filename, content)
        return result
    except ResumeExtractionError as e:
        logger.warning(f"Resume extraction error for '{file.filename}': {e.message}")
        return JSONResponse(
            status_code=e.status_code,
            content={
                "success": False,
                "detail": e.message,
                "error": e.message
            }
        )
    except Exception as e:
        logger.error(f"Unexpected error processing '{file.filename}': {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "detail": "Failed to process resume file due to an internal error.",
                "error": str(e)
            }
        )


@resume_router.get("/download/{filename}")
async def download_resume(filename: str):
    """
    Retrieve/download an original uploaded resume file by its unique saved filename.
    """
    # Sanitize filename to prevent directory traversal
    safe_name = os.path.basename(filename)
    filepath = os.path.join(UPLOAD_DIR, safe_name)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Resume file not found.")

    return FileResponse(filepath, filename=safe_name)
