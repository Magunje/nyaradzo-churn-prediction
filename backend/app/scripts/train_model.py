from app.services.ml import train_and_save_model


if __name__ == "__main__":
    metadata = train_and_save_model()
    print("Model trained successfully.")
    print(f"Selected model: {metadata['selected_model']}")
    print("Top evaluation rows:")
    for row in metadata["evaluation"]:
        print(row)

