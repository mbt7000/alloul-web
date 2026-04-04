from __future__ import annotations

from typing import Optional, Union

from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str


class FirebaseRequest(BaseModel):
    id_token: str


class AzureAdRequest(BaseModel):
    id_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: Union[int, str]
    email: str
    username: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    i_code: Optional[str] = None
    cover_url: Optional[str] = None
    location: Optional[str] = None
    skills: Optional[str] = None
    username_changed: bool = False
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    created_at: Optional[str] = None
    is_admin: bool = False

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    cover_url: Optional[str] = None
    location: Optional[str] = None
    skills: Optional[str] = None


class FirebaseResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None
