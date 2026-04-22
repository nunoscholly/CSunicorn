import numpy as np


def predict(features):
    """Placeholder prediction function. Replace with your ML model."""
    if not features:
        return 0.0
    return float(np.mean(features))
