"""
Backward-compatibility re-export shim.
Canonical schemas located in src.modules.feature_requests.schemas.
"""
from src.modules.feature_requests.schemas import (
    FeatureRequestCreate,
    FeatureRequestUpdate,
    FeatureRequestResponse,
)

__all__ = [
    "FeatureRequestCreate",
    "FeatureRequestUpdate",
    "FeatureRequestResponse",
]