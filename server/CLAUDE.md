# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start
- `npm run dev`: Run app in development mode using nodemon
- `npm start`: Start production server (uses `src/app.js`)
- Requires Node.js environment

## Code Architecture
- Express-based API server (`src/app.js` is entry point)
- Multiple DB support noted via dependencies: MySQL (mysql2) + PostgreSQL (pg)
- Uses Sequelize ORM for database interaction
- Contains real-time features via socket.io integration
- Authentication includes JWT and email verification (see recent commits)
- File uploads supported via multer dependency