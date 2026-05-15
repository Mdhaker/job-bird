from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.core.database import get_db
from app.models.candidate_profile import CandidateProfile
from app.schemas.candidate_profile import CandidateProfileCreate, CandidateProfileUpdate, CandidateProfileOut

router = APIRouter(prefix="/candidate-profiles", tags=["Candidate Profiles"])


@router.get("/", response_model=list[CandidateProfileOut])
async def list_profiles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CandidateProfile).order_by(CandidateProfile.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=CandidateProfileOut, status_code=status.HTTP_201_CREATED)
async def create_profile(payload: CandidateProfileCreate, db: AsyncSession = Depends(get_db)):
    profile = CandidateProfile(**payload.model_dump())
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


@router.get("/{profile_id}", response_model=CandidateProfileOut)
async def get_profile(profile_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CandidateProfile).where(CandidateProfile.id == profile_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.patch("/{profile_id}", response_model=CandidateProfileOut)
async def update_profile(profile_id: uuid.UUID, payload: CandidateProfileUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CandidateProfile).where(CandidateProfile.id == profile_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return profile


@router.post("/{profile_id}/upload-cv", response_model=CandidateProfileOut)
async def upload_cv(
    profile_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(CandidateProfile).where(CandidateProfile.id == profile_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if file.content_type not in ("application/pdf", "text/plain"):
        raise HTTPException(status_code=400, detail="Only PDF and plain text files are supported")

    content = await file.read()

    if file.content_type == "text/plain":
        profile.cv_text = content.decode("utf-8", errors="ignore")
    else:
        # Basic PDF text extraction via pdfplumber
        import io
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                text = "\n".join(page.extract_text() or "" for page in pdf.pages)
            profile.cv_text = text
        except ImportError:
            raise HTTPException(status_code=500, detail="PDF parsing not available — install pdfplumber")

    profile.cv_filename = file.filename
    await db.commit()
    await db.refresh(profile)
    return profile


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(profile_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CandidateProfile).where(CandidateProfile.id == profile_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    await db.delete(profile)
    await db.commit()
