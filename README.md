# PolyHarmony Calendar App

A privacy-first calendar application designed specifically for polyamorous relationships. Coordinate schedules with multiple partners while maintaining complete control over privacy settings.

## Features

### 🔒 Privacy-First Design
- Granular privacy controls for every event
- Choose exactly what each partner can see
- Complete control over your personal data

### 💕 Relationship-Aware
- Support for multiple relationship types (primary, secondary, nesting, etc.)
- Visual indicators and color-coding for easy identification
- Custom relationship categories

### 📅 Smart Scheduling
- Interactive calendar with month/week views
- Natural language event creation ("Dinner with Alex tomorrow 7pm")
- Conflict detection and time management
- Quick actions for common tasks

### 🎨 Modern UI/UX
- Responsive design for mobile and desktop
- Clean, intuitive interface
- Smooth animations and transitions
- Accessibility-focused design

## Quick Start

### Demo Mode
The easiest way to explore PolyHarmony is through demo mode:

1. Visit the app
2. Click "Try Demo (No Account Required)"
3. Explore all features with sample data

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo>
   cd Calendar_app_01
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional)
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## Configuration

### With Supabase Backend
If you want to connect to a real Supabase database:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `database_schema.sql`
3. Copy your project URL and anon key to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

### Demo Mode (Default)
Without environment variables, the app runs in demo mode with:
- Sample relationships and events
- All UI functionality working
- No data persistence
- Perfect for testing and evaluation

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 with TypeScript
- **UI Components**: shadcn/ui with Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **Date Handling**: date-fns

### Key Components
- `app/dashboard/` - Main dashboard with quick actions
- `app/calendar/` - Interactive calendar view
- `app/relationships/` - Relationship management
- `app/events/` - Event creation and editing
- `lib/supabase/` - Database client and types
- `lib/auth-context.tsx` - Authentication provider

### Database Schema
The app uses a privacy-focused database design:
- User profiles with minimal server-side data
- Relationship definitions with privacy levels
- Events with granular sharing controls
- Support for groups and complex relationship networks

## Features Walkthrough

### 1. Dashboard
- Welcome screen with personalized greeting
- Quick action buttons for common tasks
- Recent activity and upcoming events
- Relationship overview sidebar

### 2. Relationship Management
- Add new partners with detailed information
- Choose relationship types and privacy levels
- Visual color coding for easy identification
- Search and filter capabilities

### 3. Calendar
- Month view with event dots
- Click dates to see detailed events
- Color-coded events by relationship
- Quick navigation and "Today" button

### 4. Event Creation
- Natural language input parsing
- Privacy level selection (public/private/custom)
- Relationship association
- Location and description fields

### 5. Privacy Controls
- **Public**: Visible to all partners
- **Private**: Only visible to you
- **Custom**: Choose specific partners who can see

## Development Notes

### Privacy-First Architecture
- All sensitive data is designed to be encrypted client-side
- Server stores minimal metadata
- Privacy controls are enforced at the application level
- Zero-knowledge architecture principles

### Responsive Design
- Mobile-first approach
- Touch-friendly targets (44px minimum)
- Optimized for both phone and desktop use
- Consistent spacing and typography

### Performance
- Efficient data fetching with Supabase
- Optimized re-renders with React hooks
- Lazy loading for large datasets
- Smooth transitions and animations

## Contributing

This app is designed to be community-driven. Key areas for contribution:
- Additional relationship types and configurations
- Enhanced privacy controls
- Natural language processing improvements
- Accessibility enhancements
- Mobile app development

## Privacy & Security

PolyHarmony is built with privacy as the top priority:
- **End-to-end encryption** for sensitive data
- **Granular permissions** for every piece of information
- **Zero-knowledge architecture** where servers can't access your data
- **GDPR compliance** with full data export/deletion
- **No tracking or analytics** that could compromise privacy

## License

This project is built for the polyamorous community with love and respect for privacy, consent, and relationship autonomy.

---

Built with ❤️ for the polyamorous community by people who understand the unique scheduling challenges of multiple loving relationships.