import streamlit as st
from model import predict

st.title("CSUnicorn")

st.header("Prediction")

# Feature-Eingabe
features_input = st.text_input("Features (kommagetrennt eingeben, z.B. 1.0, 2.5, 3.0):")

if st.button("Vorhersage starten"):
    if features_input:
        # Eingabe in Liste von Zahlen umwandeln
        parts = features_input.split(",")
        features = []
        for part in parts:
            features.append(float(part.strip()))

        result = predict(features)
        st.write(f"Vorhersage: {result}")
    else:
        st.write("Bitte Features eingeben.")
