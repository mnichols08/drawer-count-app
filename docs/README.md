# Documentation

This folder contains comprehensive documentation for the Drawer Count App project.

## 📁 Structure

```
docs/
├── README.md                    # This file - documentation overview
├── testing/                     # Testing documentation
│   ├── README.md               # Test suite overview
│   ├── test-guide.md           # How to run and write tests
│   └── test-coverage.md        # Test coverage details
├── scripts/                     # Script documentation
│   ├── README.md               # Scripts overview
│   ├── build.md                # Build script documentation
│   ├── version-management.md   # Version bumping and releases
│   ├── icons.md                # Icon generation
│   └── images.md               # Image optimization
└── deployment/                  # Deployment documentation
    ├── README.md               # Deployment overview
    ├── github-pages.md         # GitHub Pages deployment
    └── server-setup.md         # Server deployment guide
```

## 📚 Quick Links

### For Developers
- [Test Guide](testing/test-guide.md) - How to run and write tests
- [Script Documentation](scripts/README.md) - All available scripts
- [Build Process](scripts/build.md) - How the build system works

### For Deployment
- [Deployment Guide](deployment/README.md) - How to deploy the app
- [GitHub Pages Setup](deployment/github-pages.md) - Automated deployment
- [Server Setup](deployment/server-setup.md) - Self-hosted deployment

### For Testing
- [Test Suite Overview](testing/README.md) - Complete testing documentation
- [Test Coverage](testing/test-coverage.md) - What's tested and why

## 🎯 Documentation Standards

This project follows these documentation standards:

### File Naming
- Use kebab-case for file names (`test-guide.md`, not `TestGuide.md`)
- Use descriptive names that indicate content
- Group related docs in subdirectories

### Content Structure
- Start with a brief overview/summary
- Include a table of contents for longer documents
- Use clear headings and subheadings
- Include code examples where appropriate
- End with troubleshooting or FAQ sections when relevant

### Markdown Conventions
- Use `#` for main title, `##` for sections, `###` for subsections
- Use code blocks with language specification
- Use tables for structured data
- Use emoji sparingly but effectively for visual scanning
- Include links to related documentation

## 🔄 Keeping Documentation Updated

Documentation should be updated when:
- New scripts are added to the project
- Existing scripts are modified significantly
- New deployment methods are supported
- Test coverage changes significantly
- Dependencies or requirements change

## 📖 How to Contribute

When contributing to documentation:

1. **Check existing docs** first to avoid duplication
2. **Follow the established structure** and naming conventions
3. **Include practical examples** where possible
4. **Test your examples** to ensure they work
5. **Cross-reference** related documentation
6. **Update this index** if adding new major sections

## 🛠️ Tools Used

Documentation is written in:
- **Markdown** - For all documentation files
- **GitHub Flavored Markdown** - For enhanced features like tables and code blocks
- **Mermaid** - For diagrams (when needed)

## 📍 Location Guidelines

### What goes in `/docs`
- Architecture and design decisions
- User guides and tutorials
- API documentation
- Deployment guides
- Development workflows

### What stays in `/tests`
- Test implementation files
- Test-specific README files
- Test configuration

### What goes in project root
- Main README.md (project overview)
- CHANGELOG.md
- LICENSE
- CONTRIBUTING.md (if present)

This structure ensures documentation is discoverable, maintainable, and follows common open-source project conventions.