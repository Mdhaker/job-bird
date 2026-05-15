from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.core.database import get_db
from app.core.security import encrypt
from app.models.linkedin_account import LinkedInAccount
from app.schemas.linkedin_account import LinkedInAccountCreate, LinkedInAccountUpdate, LinkedInAccountOut

router = APIRouter(prefix="/linkedin-accounts", tags=["LinkedIn Accounts"])


@router.get("/", response_model=list[LinkedInAccountOut])
async def list_accounts(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LinkedInAccount).order_by(LinkedInAccount.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=LinkedInAccountOut, status_code=status.HTTP_201_CREATED)
async def create_account(payload: LinkedInAccountCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(LinkedInAccount).where(LinkedInAccount.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Account with this email already exists")

    account = LinkedInAccount(
        label=payload.label,
        email=payload.email,
        encrypted_password=encrypt(payload.password),
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


@router.get("/{account_id}", response_model=LinkedInAccountOut)
async def get_account(account_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LinkedInAccount).where(LinkedInAccount.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.patch("/{account_id}", response_model=LinkedInAccountOut)
async def update_account(account_id: uuid.UUID, payload: LinkedInAccountUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LinkedInAccount).where(LinkedInAccount.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if payload.label is not None:
        account.label = payload.label
    if payload.password is not None:
        account.encrypted_password = encrypt(payload.password)
    if payload.is_active is not None:
        account.is_active = payload.is_active

    await db.commit()
    await db.refresh(account)
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(account_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(LinkedInAccount).where(LinkedInAccount.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    await db.delete(account)
    await db.commit()
