# Architecture

## Frontend

- Frontends are built with **React.js** in **JavaScript** — **no TypeScript**.
- We build simple demo applications, so we **do not use databases**.
  - Data is kept in **in-memory collections**, e.g. a list of users, per-user data, etc.
- Frontends are **always run locally**, **without a Docker container**.

## Backend

- Backends are written in **.NET / .NET Core 9.0**.
- Backends are **always hosted in Docker containers**.
- Containers we build are **always placed in Docker Compose**, so they can see each other over the network and stay in one group (a shared Docker network).
- As with the frontend, demo applications keep data in **in-memory collections** instead of a database.

## Summary

| Layer     | Technology            | How it runs             | Data        |
| --------- | --------------------- | ----------------------- | ----------- |
| Frontend  | React.js (JavaScript) | Locally, no container   | In-memory   |
| Backend   | .NET Core 9.0         | Docker container        | In-memory   |
