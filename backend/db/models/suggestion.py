from sqlalchemy import Column, String, Integer, Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from db.database import Base
import uuid


class CitationSuggestion(Base):
    __tablename__ = "citation_suggestions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sentence_id = Column(
        UUID(as_uuid=True), ForeignKey("sentences.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    rank = Column(Integer, nullable=False)  # 0 = top, 1, 2
    title = Column(String(1000), nullable=False)
    authors = Column(String(1000), nullable=True)
    year = Column(Integer, nullable=True)
    journal = Column(String(500), nullable=True)
    volume = Column(String(50), nullable=True)
    pages = Column(String(50), nullable=True)
    doi = Column(String(300), nullable=True)
    abstract = Column(Text, nullable=True)
    citation_count = Column(Integer, default=0)
    confidence_score = Column(Float, default=0.0)
    semantic_score = Column(Float, default=0.0)
    verification_status = Column(String(10), default="PARTIAL")  # YES | PARTIAL | NO

    sentence = relationship("Sentence", back_populates="suggestions")
