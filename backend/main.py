import os
import ollama

from datetime import datetime, timedelta
from dotenv import load_dotenv

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel, EmailStr

from sqlalchemy import text
from sqlalchemy.orm import Session

from database import engine, Base, SessionLocal

from security import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    security,
    create_reset_token
)

import models

from email_service import send_password_reset_email


# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

load_dotenv()

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:5173"
)


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI()


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# CREATE DATABASE TABLES
# =========================================================

Base.metadata.create_all(bind=engine)


# =========================================================
# BASIC ROUTES
# =========================================================

@app.get("/")
def root():
    return {
        "message": "CampusMate AI backend is running!"
    }


@app.get("/test-db")
def test_db():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))

        return {
            "database": result.scalar() == 1
        }


# =========================================================
# DATABASE SESSION
# =========================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# =========================================================
# REGISTRATION
# =========================================================

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    language: str | None = None


@app.post("/auth/register")
def register_user(
    user: RegisterRequest,
    db: Session = Depends(get_db)
):
    # Check if email already exists
    existing_user = (
        db.query(models.User)
        .filter(models.User.email == user.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists."
        )

    # Public registration creates a student account
    new_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=hash_password(user.password),
        role="student",
        language=user.language
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Account created successfully",
        "user_id": new_user.id
    }


# =========================================================
# LOGIN
# =========================================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@app.post("/auth/login")
def login_user(
    user: LoginRequest,
    db: Session = Depends(get_db)
):
    # Find user by email
    existing_user = (
        db.query(models.User)
        .filter(models.User.email == user.email)
        .first()
    )

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    # Verify password
    if not verify_password(
        user.password,
        existing_user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    # Generate JWT
    access_token = create_access_token(
        user_id=existing_user.id,
        role=existing_user.role
    )

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": existing_user.id,
        "name": existing_user.name,
        "email": existing_user.email,
        "role": existing_user.role,
        "language": existing_user.language
    }


# =========================================================
# CURRENT USER
# =========================================================

@app.get("/auth/me")
def get_current_user(
    credentials=Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    # Decode and verify JWT
    payload = decode_access_token(token)

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token."
        )

    # Find user in database
    current_user = (
        db.query(models.User)
        .filter(models.User.id == int(user_id))
        .first()
    )

    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="User not found."
        )

    return {
        "user_id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "language": current_user.language
    }


# =========================================================
# FORGOT PASSWORD
# =========================================================

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@app.post("/auth/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    user = (
        db.query(models.User)
        .filter(models.User.email == request.email)
        .first()
    )

    # Don't reveal whether an email exists
    if not user:
        return {
            "message": (
                "If an account exists for this email, "
                "a password reset link has been sent."
            )
        }

    # Generate secure reset token
    reset_token = create_reset_token()

    user.reset_token = reset_token

    # Token expires after 15 minutes
    user.reset_token_expires = (
        datetime.utcnow() + timedelta(minutes=15)
    )

    db.commit()

    # Create frontend reset URL
    reset_link = (
        f"{FRONTEND_URL}/reset-password"
        f"?token={reset_token}"
    )

    # Send reset email
    try:
        send_password_reset_email(
            recipient_email=user.email,
            recipient_name=user.name,
            reset_link=reset_link
        )

    except Exception as e:
        # Don't leave a valid reset token in the database
        # if the email couldn't be sent.
        user.reset_token = None
        user.reset_token_expires = None

        db.commit()

        print(f"Password reset email failed: {e}")

        raise HTTPException(
            status_code=500,
            detail="Unable to send password reset email."
        )

    return {
        "message": (
            "If an account exists for this email, "
            "a password reset link has been sent."
        )
    }


# =========================================================
# RESET PASSWORD
# =========================================================

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@app.post("/auth/reset-password")
def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    # Find user using reset token
    user = (
        db.query(models.User)
        .filter(models.User.reset_token == request.token)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token."
        )

    # Check token expiration
    if (
        not user.reset_token_expires
        or user.reset_token_expires < datetime.utcnow()
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token."
        )

    # Hash the new password
    user.password_hash = hash_password(
        request.new_password
    )

    # Make reset token single-use
    user.reset_token = None
    user.reset_token_expires = None

    db.commit()

    return {
        "message": "Password reset successfully."
    }


# =========================================================
# CAMPUSMATE AI CHAT - LOCAL OLLAMA
# =========================================================
class ChatRequest(BaseModel):
    message: str
    conversation_id: str
    domain: str | None = None

@app.post("/ai/chat")
def ai_chat(
    request: ChatRequest,
    credentials=Depends(security),
    db: Session = Depends(get_db)
):
    # -----------------------------------------------------
    # Verify JWT
    # -----------------------------------------------------

    token = credentials.credentials

    payload = decode_access_token(token)

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token."
        )

    # -----------------------------------------------------
    # Find logged-in user
    # -----------------------------------------------------

    current_user = (
        db.query(models.User)
        .filter(models.User.id == int(user_id))
        .first()
    )

    if not current_user:
        raise HTTPException(
            status_code=401,
            detail="User not found."
        )

    # -----------------------------------------------------
    # Validate message
    # -----------------------------------------------------

    message = request.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    # -----------------------------------------------------
    # Validate conversation ID
    # -----------------------------------------------------

    conversation_id = request.conversation_id.strip()

    if not conversation_id:
        raise HTTPException(
            status_code=400,
            detail="Conversation ID is required."
        )

    # -----------------------------------------------------
    # CampusMate AI instructions
    # -----------------------------------------------------

    instructions = f"""
You are CampusMate AI, an intelligent college companion.

You are currently helping a student named {current_user.name}.

Your role is to help students with:

- College-related questions
- Academic questions
- Courses
- Assignments
- Timetables
- Study planning
- Exam preparation
- Student life
- Library information
- Canteen information
- Campus navigation
- Co-curricular activities
- General college assistance

Be friendly, helpful, clear, and concise.

IMPORTANT:
You should not invent college-specific information.

If you don't have enough information to answer
a college-specific question, clearly say that
the information is not currently available.

You are CampusMate AI, a college companion,
not a generic chatbot.
"""

    # -----------------------------------------------------
    # Save USER message
    # -----------------------------------------------------

    user_chat = models.ChatMessage(
        user_id=current_user.id,
        conversation_id=conversation_id,
        role="user",
        content=message,
        domain=request.domain
    )

    db.add(user_chat)
    db.commit()

    # -----------------------------------------------------
    # Send request to Ollama
    # -----------------------------------------------------

    try:

        response = ollama.chat(
            model="llama3.2",
            messages=[
                {
                    "role": "system",
                    "content": instructions
                },
                {
                    "role": "user",
                    "content": message
                }
            ]
        )

        ai_response = response["message"]["content"]

        # -------------------------------------------------
        # Save AI response
        # -------------------------------------------------

        ai_chat_message = models.ChatMessage(
            user_id=current_user.id,
            conversation_id=conversation_id,
            role="assistant",
            content=ai_response,
            domain=request.domain
        )

        db.add(ai_chat_message)
        db.commit()

        # -------------------------------------------------
        # Return response
        # -------------------------------------------------

        return {
            "response": ai_response,
            "conversation_id": conversation_id
        }

    except Exception as e:

        db.rollback()

        print(
            f"Ollama error: {e}"
        )

        raise HTTPException(
            status_code=500,
            detail="CampusMate AI could not generate a response."
        )
@app.get("/ai/history")
def get_chat_history(
    credentials=Depends(security),
    db: Session = Depends(get_db)
):
    # -----------------------------------------------------
    # Verify JWT
    # -----------------------------------------------------

    token = credentials.credentials

    payload = decode_access_token(token)

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token."
        )

    # -----------------------------------------------------
    # Get user's messages
    # -----------------------------------------------------

    messages = (
        db.query(models.ChatMessage)
        .filter(
            models.ChatMessage.user_id == int(user_id)
        )
        .order_by(
            models.ChatMessage.created_at.asc()
        )
        .all()
    )

    return {
        "history": [
            {
                "id": item.id,
                "conversation_id": item.conversation_id,
                "role": item.role,
                "content": item.content,
                "domain": item.domain,
                "created_at": item.created_at.isoformat()
            }
            for item in messages
        ]
    }
@app.get("/ai/history/{conversation_id}")
def get_conversation(
    conversation_id: str,
    credentials=Depends(security),
    db: Session = Depends(get_db)
):
    # -----------------------------------------------------
    # Verify JWT
    # -----------------------------------------------------

    token = credentials.credentials

    payload = decode_access_token(token)

    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication token."
        )

    # -----------------------------------------------------
    # Get conversation
    # -----------------------------------------------------

    messages = (
        db.query(models.ChatMessage)
        .filter(
            models.ChatMessage.user_id == int(user_id),
            models.ChatMessage.conversation_id == conversation_id
        )
        .order_by(
            models.ChatMessage.created_at.asc()
        )
        .all()
    )

    return {
        "conversation_id": conversation_id,
        "messages": [
            {
                "id": item.id,
                "role": item.role,
                "content": item.content,
                "domain": item.domain,
                "created_at": item.created_at.isoformat()
            }
            for item in messages
        ]
    }