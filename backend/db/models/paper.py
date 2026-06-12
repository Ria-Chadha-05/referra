from sqlalchemy import Column, String, Integer, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from db.database import Base
import uuid
import datetime


class CachedPaper(Base):
    __tablename__ = "cached_papers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    doi = Column(String(300), unique=True, nullable=True, index=True)
    semantic_scholar_id = Column(String(100), unique=True, nullable=True, index=True)
    title = Column(String(1000), nullable=False)
    authors = Column(String(1000), nullable=True)
    year = Column(Integer, nullable=True)
    journal = Column(String(500), nullable=True)
    volume = Column(String(50), nullable=True)
    pages = Column(String(50), nullable=True)
    abstract = Column(Text, nullable=True)
    citation_count = Column(Integer, default=0)
    cached_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
