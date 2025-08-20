# PolyHarmony Project Organization

This document outlines the organized structure of the PolyHarmony project after the cleanup and reorganization.

## 🗂️ **Directory Structure**

```
Calendar_app_01/
├── 📱 app/                    # Next.js app router pages
│   ├── auth/                  # Authentication pages
│   ├── calendar/              # Calendar view
│   ├── dashboard/             # Main dashboard
│   ├── events/                # Event management
│   ├── groups/                # Group management
│   ├── relationships/          # Relationship management
│   ├── settings/              # User settings
│   └── globals.css            # Global styles
├── 🧩 components/             # Reusable UI components
│   └── ui/                    # shadcn/ui components
├── 📚 docs/                   # Project documentation
│   ├── README.md              # Documentation index
│   ├── SETUP_GUIDE.md         # Setup instructions
│   ├── TECH_STACK.md          # Technology decisions
│   ├── PRD.md                 # Product requirements
│   ├── PERFORMANCE_OPTIMIZATIONS.md
│   ├── MOBILE_MIGRATION_GUIDE.md
│   ├── Handover.md            # Project handover
│   ├── Larger_vision.md       # Long-term vision
│   ├── Prioritized_features.md
│   └── Proposed_Stack.md
├── 🗄️ schemas/                # Database schemas
│   ├── README.md              # Schema documentation
│   ├── mvp_schema.sql         # Primary production schema
│   ├── database_schema.sql    # Original schema
│   ├── database_schema_fixed.sql
│   ├── polyharmony_schema.sql
│   ├── postgresql_schema.sql
│   ├── universal_schema.sql
│   └── schema_postgres_clean.sql
├── 🔧 scripts/                # Utility scripts
│   ├── README.md              # Script documentation
│   ├── deploy-schema.js       # Schema deployment
│   ├── test-connection.js     # Connection testing
│   └── test-setup.js          # Setup verification
├── 📱 mobile/                 # React Native mobile app
│   ├── README.md              # Mobile app documentation
│   ├── App.tsx                # Main app component
│   ├── app.json               # Expo configuration
│   ├── assets/                # Mobile assets
│   └── lib/                   # Mobile utilities
├── 🛠️ lib/                    # Core utilities
│   ├── auth-context.tsx       # Authentication context
│   ├── demo-store.ts          # Demo mode store
│   ├── supabase/              # Supabase configuration
│   └── utils.ts               # Utility functions
├── 🪝 hooks/                  # Custom React hooks
│   └── use-toast.ts           # Toast notifications
├── 📖 References/             # Reference materials
│   └── Calendar interface example.avif
├── 📄 Configuration Files
│   ├── package.json           # Dependencies and scripts
│   ├── tsconfig.json          # TypeScript configuration
│   ├── next.config.js         # Next.js configuration
│   ├── tailwind.config.ts     # Tailwind CSS configuration
│   ├── postcss.config.js      # PostCSS configuration
│   ├── components.json        # shadcn/ui configuration
│   └── .gitignore             # Git ignore patterns
└── 📋 Documentation
    ├── README.md              # Main project overview
    ├── PROJECT_ORGANIZATION.md # This file
    ├── SETUP_GUIDE.md         # Development setup
    └── TECH_STACK.md          # Technology overview
```

## 🎯 **Organization Principles**

### 1. **Logical Grouping**
- **Related functionality** is grouped together
- **Clear separation** between different types of content
- **Intuitive navigation** for developers and contributors

### 2. **Documentation-First**
- **Comprehensive READMEs** in each directory
- **Clear navigation** between related documents
- **Consistent formatting** and structure

### 3. **Separation of Concerns**
- **Web application** in `app/` and `components/`
- **Mobile application** in `mobile/`
- **Database schemas** in `schemas/`
- **Utility scripts** in `scripts/`
- **Documentation** in `docs/`

### 4. **Maintainability**
- **Easy to find** specific files and information
- **Clear ownership** of different components
- **Scalable structure** for future growth

## 🔄 **Migration Summary**

### What Was Moved
- **Schema files** → `schemas/` directory
- **Documentation** → `docs/` directory  
- **Mobile app** → `mobile/` directory
- **Utility scripts** → `scripts/` directory

### What Was Cleaned Up
- **Duplicate schema files** consolidated
- **Unnecessary build artifacts** removed
- **Improved .gitignore** patterns
- **Better documentation** structure

### What Was Improved
- **README files** in each directory
- **Clear navigation** between components
- **Consistent formatting** and organization
- **Professional appearance** and structure

## 📚 **Navigation Guide**

### For **New Developers**
1. Start with [README.md](./README.md)
2. Review [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md)
3. Check [TECH_STACK.md](./docs/TECH_STACK.md)

### For **Database Work**
1. Check [schemas/README.md](./schemas/README.md)
2. Use `mvp_schema.sql` for new deployments
3. Run scripts from [scripts/](./scripts/) directory

### For **Mobile Development**
1. Review [mobile/README.md](./mobile/README.md)
2. Check [MOBILE_MIGRATION_GUIDE.md](./docs/MOBILE_MIGRATION_GUIDE.md)
3. Use Expo CLI for development

### For **Contributing**
1. Read [docs/README.md](./docs/README.md)
2. Follow established patterns
3. Update relevant documentation

## 🧹 **Maintenance Guidelines**

### Regular Tasks
- **Update documentation** when features change
- **Review and clean** build artifacts
- **Validate schema** consistency
- **Test scripts** functionality

### Before Committing
- **Check file organization** follows structure
- **Update relevant READMEs** if needed
- **Verify documentation** is current
- **Test scripts** if modified

### Adding New Components
1. **Choose appropriate directory** based on purpose
2. **Create README** if it's a new directory
3. **Update navigation** in related documents
4. **Follow naming conventions**

## 🎉 **Benefits of New Organization**

### For **Developers**
- **Faster navigation** to relevant files
- **Clearer understanding** of project structure
- **Easier onboarding** for new team members
- **Better separation** of concerns

### For **Contributors**
- **Clear guidelines** for where to add code
- **Comprehensive documentation** for each area
- **Consistent patterns** to follow
- **Professional appearance** that builds confidence

### For **Maintainers**
- **Easier code reviews** with logical grouping
- **Simpler dependency management**
- **Better testing organization**
- **Clearer deployment processes**

## 🔮 **Future Improvements**

### Planned Enhancements
- [ ] **Automated documentation** generation
- [ ] **Schema validation** scripts
- [ ] **Component library** documentation
- [ ] **API documentation** generation
- [ ] **Performance monitoring** dashboard

### Scalability Considerations
- **Modular architecture** supports growth
- **Clear boundaries** prevent confusion
- **Documentation standards** ensure consistency
- **Script automation** reduces manual work

---

**Last Updated**: December 2024  
**Maintained by**: PolyHarmony Development Team

This organization structure makes the PolyHarmony project more professional, maintainable, and developer-friendly. Each directory has a clear purpose and comprehensive documentation to guide users and contributors.
