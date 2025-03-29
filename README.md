# 🤖 Arbi

An advanced AI orchestration platform with agent management, web automation, voice interface, and secure transactions.

## Overview

Arbi is a comprehensive AI orchestration platform that enables building, managing, and deploying intelligent agents that can seamlessly interact with web applications, process voice commands, and handle secure transactions.

## System Architecture

### Core Layer: AI Engine & Orchestration

- **OpenAI Agents SDK** provides the foundation for creating and managing intelligent agents
- **Handoffs** mechanism enables seamless collaboration between specialized agents
- **Guardrails** ensure security and reliability by validating inputs and outputs

### Functional Layers

#### Web Interaction Layer
- **Browser Automation** using browser-use provides:
  - Direct AI agent control of web browsers
  - Ability to navigate complex websites
  - Data extraction capabilities
  - Form submission and interaction

#### Voice Interface Layer
- **Whisper API** for speech recognition
- Integration with **Porcupine** for wake word detection
- Voice synthesis using **ElevenLabs API**

#### Transaction Layer
- **Hyperswitch** for payment orchestration
- **OpenSSL** for secure communication and encryption
- Custom security protocols for sensitive data handling

#### Data Layer
- **PostgreSQL** for relational data storage
- **Redis** for caching and session management
- **Pandas/NumPy** for data analysis and transformation

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- pnpm (v8 or later)
- Docker and Docker Compose (for local development)

### Installation

```bash
# Clone the repository
git clone https://github.com/ActivateLLC/arbi.git
cd arbi

# Install dependencies
pnpm install

# Start development environment
pnpm dev
```

## Project Structure

This project is organized as a monorepo using pnpm workspaces:

- `apps/` - Application packages
  - `api/` - Main API service
  - `web/` - Web interface
  - `cli/` - Command-line interface tool
- `packages/` - Shared library packages
  - `ai-engine/` - Core AI engine and orchestration
  - `web-automation/` - Browser automation utilities
  - `voice-interface/` - Voice processing capabilities
  - `transaction/` - Payment and security modules
  - `data/` - Data processing and storage utilities
  - `config/` - Shared configuration
  - `tsconfig/` - Shared TypeScript configurations
  - `eslint-config/` - Shared ESLint configurations
  - `utils/` - Common utilities and helpers

## License

[MIT](LICENSE)
