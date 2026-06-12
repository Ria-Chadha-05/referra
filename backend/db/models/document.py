from sqlalchemy import Column, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from db.database import Base
import uuid
import datetime


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    title = Column(String(500), default="Untitled Document", nullable=False)
    raw_text = Column(Text, nullable=False)
    # Full pipeline result stored as JSON for reloading without re-running AI
    pipeline_result = Column(JSON, nullable=True)
    # User decisions: {sentenceId: {refIndex: int, status: "accepted"|"ignored"}}
    decisions = Column(JSON, nullable=True, default=dict)
    citation_style = Column(String(10), default="APA", nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        nullable=False,
    )

    user = relationship("User", back_populates="documents")
    sentences = relationship(
        "Sentence",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="Sentence.sentence_index",
    )
    selected_citations = relationship(
        "SelectedCitation",
        back_populates="document",
        cascade="all, delete-orphan",
    )
