# Use the official Dart image
FROM dart:stable AS build

# Set the working directory
WORKDIR /app

# Copy pubspec files
COPY pubspec.* ./

# Get dependencies
RUN dart pub get

# Copy the source code
COPY . .

# Resolve app dependencies
RUN dart pub get --offline

# Ensure packages are available
RUN dart pub deps

# Compile the app
RUN dart compile exe bin/main.dart -o calendar_server

# Build minimal serving image from AOT-compiled binary
FROM scratch
COPY --from=build /runtime/ /
COPY --from=build /app/calendar_server /app/
COPY --from=build /app/config/ /app/config/

# Expose the port
EXPOSE 8080

# Start server
ENTRYPOINT ["/app/calendar_server"]