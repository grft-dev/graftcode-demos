# Security

## Authentication

- We **always** handle authentication via **JWT token**.

## Endpoint authorization

- Endpoints containing **business logic** must **validate the JWT token**.
- Missing or invalid token → reject the request (401 Unauthorized).
