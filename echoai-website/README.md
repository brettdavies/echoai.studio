# Echo AI Website

Marketing website for Echo AI, featuring responsive UI and interactive diagrams.

## Development

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Linting

```bash
# Check for linting errors
npm run lint

# Automatically fix linting errors where possible
npm run lint:fix
```

The project uses ESLint with TypeScript support. Configuration is in `.eslintrc.cjs` with special rules to ignore unused React imports.

### Technology Stack

- React 18.2.0
- TypeScript
- Vite
- TailwindCSS
- Mermaid (for interactive diagrams)

## Deployment

This project is deployed on Cloudflare Pages, which requires specific dependency versions for compatibility with Node.js 18.17.1.

### Deployment Notes

- The `package.json` has been configured for Cloudflare Pages compatibility
- The site is automatically deployed when changes are pushed to the main branch
- Type checking is performed during the build process

### Known Issues

#### TypeScript Configuration

- `noUnusedLocals` is set to `false` to prevent errors with unused React imports
- React 18 with JSX transform doesn't require explicit React imports, but they're kept for compatibility

#### Dependency Warnings

The project has some deprecated indirect dependencies that show warnings during installation. These are intentionally not addressed to maintain compatibility with Cloudflare Pages (Node.js 18.17.1).

These warnings do not affect the production build and will be addressed when Cloudflare Pages updates their Node.js version.

## Responsive Design

The website includes responsive components that adapt to different screen sizes:

- The diagram in the Workflow Canvas section changes orientation based on screen width
- Mobile-friendly navigation and layout

## Contributing

Before submitting changes, please:

1. Run `npm run build` to ensure there are no TypeScript or build errors
2. Run `npm run lint` to check for code quality issues
3. Test the site on multiple screen sizes
4. Verify that all interactive elements work correctly
