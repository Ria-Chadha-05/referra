from sqlalchemy import Column, String, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from db.database import Base
import uuid


class Sentence(Base):
    __tablename__ = "sentences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    sentence_index = Column(Integer, nullable=False)
    text = Column(String(2000), nullable=False)
    is_claim = Column(Boolean, default=False, nullable=False)
    claim_type = Column(String(50), nullable=True)

    document = relationship("Document", back_populates="sentences")
    suggestions = relationship(
        "CitationSuggestion",
        back_populates="sentence",
        cascade="all, delete-orphan",
        order_by="CitationSuggestion.rank",
    )
