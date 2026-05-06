# syntax=docker/dockerfile:1.7

# --- Build stage ---
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Cache dependencies first
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

# Build
COPY src ./src
RUN mvn -B -q clean package -DskipTests

# --- Run stage ---
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Non-root user
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

COPY --from=build /app/target/memoria-backend.jar app.jar

EXPOSE 8082

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"

ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar /app/app.jar"]
