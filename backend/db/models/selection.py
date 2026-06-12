from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from db.database import Base
import uuid


class SelectedCitation(Base):
    __tablename__ = "selected_citations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    sentence_index = Column(Integer, nullable=False)
    ref_index = Column(Integer, nullable=False)
    status = Column(String(10), nullable=False)  # accepted | ignored

    document = relationship("Document", back_populates="selected_citations")
