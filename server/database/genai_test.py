import os
from google import genai
from google.genai import types

with open('../images/signatures/sig-1.jpg', 'rb') as f:
    image_bytes = f.read()

client = genai.Client(api_key=os.getenv('API_KEY'))
response = client.models.generate_content(
model='gemini-2.5-flash',
contents=[
    types.Part.from_bytes(
    data=image_bytes,
    mime_type='image/jpeg',
    ),
    'Generate embedding vector for the above signature image. Return the embedding as a raw python array of floats. Do not include any other text or formatting, like "```python" or anything, just return the raw array.'
]
)


# Convert string to list of floats
import ast
embedding_vector = ast.literal_eval(response.text)

print(type(embedding_vector))  # should be <class 'list'>
print(len(embedding_vector))   # dimension of your embedding
print(embedding_vector[:10])   # first 10 values
