# Spec Delta

## Purpose

Provide the runnable full-stack application foundation for cubeclash: serving the app locally and in production, rendering pages server-side, routing between pages, and applying styles. All future product capabilities build on this boundary.

## ADDED Requirements

### Requirement: Development server serves the application
The system SHALL provide a single command that starts a development server on the local machine, serving the application over HTTP at a documented local port with server-side rendering and hot module replacement.

#### Scenario: Developer starts the app
- **WHEN** the developer runs the dev command (`pnpm dev`) in the repository root
- **THEN** a development server starts and responds successfully to HTTP requests at `http://localhost:3000`

#### Scenario: Edits apply without restart
- **WHEN** the developer modifies a route component or stylesheet while the dev server is running
- **THEN** the running page reflects the change without restarting the server

### Requirement: Home page renders server-side
The system SHALL render the root path (`/`) as a server-rendered HTML page containing visible home page content, and the page SHALL become interactive after hydration.

#### Scenario: First request to the root path
- **WHEN** a client sends an HTTP GET request to `/`
- **THEN** the response is HTML that contains the home page content before any client-side JavaScript executes

#### Scenario: Home page becomes interactive
- **WHEN** the home page is opened in a browser
- **THEN** the page hydrates without console errors and responds to user interaction

### Requirement: File-based routing with not-found handling
The system SHALL register pages as routes from files in the routes directory, SHALL render the page registered for the requested path, and SHALL respond with a not-found page for undefined paths.

#### Scenario: Navigate to a defined route
- **WHEN** a user navigates to the path of a defined route
- **THEN** the page registered for that path is rendered

#### Scenario: Navigate to an undefined route
- **WHEN** a user requests a path for which no route is defined
- **THEN** the application responds with a not-found page and a 404 status

### Requirement: Tailwind styling pipeline
The system SHALL compile Tailwind CSS v4 utility classes used in the application into a global stylesheet that is loaded on every page, in both development and production.

#### Scenario: Utility classes are applied
- **WHEN** a page component uses Tailwind utility classes
- **THEN** the rendered page displays with those styles applied

#### Scenario: Stylesheet is linked on every page
- **WHEN** any route of the application is served
- **THEN** the response links the compiled global stylesheet

### Requirement: Production build and serve
The system SHALL provide a build command that compiles the application without errors and a command to serve the production build, where the home page behaves as in development.

#### Scenario: Build succeeds
- **WHEN** the developer runs the build command (`pnpm build`)
- **THEN** the build completes without errors and produces deployable output

#### Scenario: Production app responds
- **WHEN** the developer serves the production build and requests `/`
- **THEN** the home page is returned with its content and styles intact
