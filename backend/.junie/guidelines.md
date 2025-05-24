# Application Development Guidelines

## 1. Introduction

This document defines the development standards, procedures, and considerations necessary for the successful completion
of the 'Part-time Work Attendance and Payroll Management Application' development project. The foundational requirements
and detailed specifications for this project are outlined in the project proposal report located at
`C:\Users\LeeHoYoung\IdeaProjects\sodam\ProjectDoc.pdf`.

All participating developers must understand and adhere to these guidelines, referencing the detailed requirements in
the linked PDF report, to improve code quality, enhance collaboration efficiency, and build a stable, maintainable, and
performant system.

## 2. Technology Stack and Environment Setup

The technology stack specified in the project proposal report (`C:\Users\LeeHoYoung\IdeaProjects\sodam\ProjectDoc.pdf`)
is as follows. When setting up the development environment, use the standard development environment and recommended
versions for the following technologies:

* **Backend:** Java
* **Framework** Spring Boot 3.4.x
* **Web Frontend:** React
* **Android:** Kotlin
* **iOS:** Swift
* **Database:** MySQL
* **Cache:** Redis
* **Server Environment:** AWS

Specific coding conventions and detailed environment setup instructions for each technology stack will be documented
separately and shared to ensure all team members work in a unified and consistent environment.

## 3. Code Quality and Coding Conventions

* **Naming Conventions:** Follow the established conventions of each technology stack (e.g., CamelCase for
  variables/methods in Java, PascalCase for Class names) using descriptive and unambiguous names. Avoid arbitrary
  abbreviations. All abbreviations must be agreed upon by the team.
* **Code Formatting:** Employ consistent code formatting using standard tools (e.g., Prettier, ESLint, ktfmt,
  SwiftFormat). Configure tools to enforce unified rules regarding indentation, spacing, line breaks, etc. Automatic
  formatting on commit or save is highly recommended.
* **Comments:** Write clear and concise comments for non-obvious code sections, complex logic, or areas requiring
  context. Public APIs, classes, and methods should have comprehensive documentation comments (Javadoc, KDoc, SwiftDoc)
  explaining their purpose, parameters, return values, and potential exceptions.
* **In principle, all annotations and documents should be written in Korean.**
* **Function/Method Design:** Functions and methods should ideally adhere to the Single Responsibility Principle (SRP),
  doing one thing well. Aim for short, focused units of code (generally under 100 lines), enhancing readability and
  testability.
* **DRY (Don't Repeat Yourself):** Avoid duplicating code. Identify and refactor repetitive logic into reusable
  functions, classes, or modules.

## 4. Robust Error Handling

Error handling is crucial for building resilient applications. Beyond simply catching exceptions, effective error
handling involves understanding the nature of errors and responding appropriately. **Excessive and improper use
of `try-catch` significantly degrades system reliability and maintainability.**

* **Common Pitfalls of Poor Error Handling:**
    * **Silent Failures:** Catching exceptions and doing nothing, leading to unnoticed failures.
    * **Generic Catch-Alls:** Using `catch (Exception e)` or `catch (Throwable t)` too broadly, obscuring specific error
      types and making targeted recovery impossible.
    * **Logging Without Context:** Logging error messages without sufficient contextual information (user ID, request
      parameters, stack trace) makes debugging difficult.
    * **Ignoring Checked Exceptions:** Incorrectly wrapping or re-throwing checked exceptions as unchecked, losing
      important information about potential failures that should be handled.
    * **Returning Null or Magic Values:** Instead of throwing an exception or returning an Optional/Result type,
      returning `null` or special values that represent errors, leading to potential `NullPointerException`s or
      incorrect logic downstream.

* **Guidelines for Effective Error Handling:**
    * **Understand Exception Types:** Differentiate between checked and unchecked exceptions. Handle checked exceptions
      where recovery is possible, and let unchecked exceptions propagate to a central error handler unless you have a
      specific reason to intercept them.
    * **Catch Specific Exceptions:** Catch the most specific exception type possible. This allows for tailored handling
      logic for different error scenarios.
    * **Wrap and Re-throw:** If you catch an exception but cannot fully handle it, wrap it in a more context-specific
      custom exception and re-throw it. This preserves the original cause while adding relevant information for higher
      layers.
    * **Centralized Error Handling:** Implement a centralized mechanism (e.g., Global Exception Handler in Spring Boot,
      middleware in React/Node.js) to process unhandled exceptions, log them consistently, and provide appropriate
      responses to the client (e.g., HTTP status codes and error messages).
    * **Informative Logging:** Log errors with sufficient detail, including the full stack trace, relevant input
      parameters, and correlation IDs (if applicable) to trace requests across services. Use appropriate logging
      levels (DEBUG, INFO, WARN, ERROR, FATAL).
    * **Custom Exceptions:** Define custom exception types for business logic errors or specific application states.
      This improves code clarity and allows calling code to handle application-specific errors gracefully.
    * **Graceful Degradation:** Design parts of the system to degrade gracefully in case of non-critical errors,
      maintaining partial functionality where possible.
    * **Validation First:** Implement thorough input validation at the boundaries of your application to prevent many
      errors before they occur.

## 5. Planning, Design, and Management

Comprehensive planning, robust design, and proactive management are foundational. **Proceeding with `미개획` (insufficient
planning) will inevitably lead to significant project setbacks.**

* **Consequences of Poor Planning:**
    * **Scope Creep & Moving Targets:** Lack of clear requirements and design leads to constant changes and expansion of
      project scope.
    * **Technical Debt Accumulation:** Rushed development due to poor scheduling results in suboptimal solutions and
      code quality issues that burden future development.
    * **Integration Hell:** Modules developed in isolation without clear interface definitions lead to significant
      effort during integration.
    * **Unforeseen Challenges:** Critical dependencies, performance bottlenecks, or security risks are discovered late
      in the cycle.
    * **Demoralized Team:** Constant firefighting, rework, and missed deadlines negatively impact team morale and
      productivity.

* **Guidelines for Effective Planning, Design, and Management:**
    * **Detailed Requirement Analysis:** Thoroughly analyze the requirements documented in the project proposal (
      `C:\Users\LeeHoYoung\IdeaProjects\sodam\ProjectDoc.pdf`). Engage stakeholders to clarify ambiguities and define
      acceptance criteria for each feature.
    * **Architectural Design:** Design the overall system architecture, considering scalability, reliability, security,
      and maintainability. Choose appropriate patterns (e.g., MVC, Layered Architecture, Microservices if applicable)
      and justify design decisions. Conduct design reviews for critical components.
    * **Module-Level Design:** Design individual modules and their interfaces in detail before implementation. Define
      data structures, algorithms, and interaction patterns.
    * **Task Breakdown & Estimation:** Break down design components into granular development tasks. Provide realistic
      effort estimates based on complexity and dependencies.
    * **Agile Methodologies:** Adopt an iterative development approach (Scrum, Kanban) to manage complexity, incorporate
      feedback early, and respond to changes. Define clear sprint goals and backlogs.
    * **Regular Communication:** Conduct daily stand-ups and regular progress meetings to synchronize efforts, discuss
      roadblocks, and adjust plans. Foster an environment of open communication.
    * **Risk Management:** Identify potential technical, schedule, or resource risks early and develop mitigation
      strategies.
    * **Continuous Improvement (Retrospectives):** Regularly reflect on the development process, identify what worked
      well and what didn't, and implement improvements for future iterations.

## 6. Cultivating Advanced Development Skills

Moving beyond functional correctness to developing high-quality, maintainable, and performant code requires adopting
practices common among experienced developers.

* **Embrace Design Principles:** Apply principles like SOLID (Single Responsibility, Open/Closed, Liskov Substitution,
  Interface Segregation, Dependency Inversion), DRY (Don't Repeat Yourself), KISS (Keep It Simple, Stupid), and YAGNI (
  You Aren't Gonna Need It). These principles guide the creation of flexible, understandable, and maintainable
  codebases.
* **Write Testable Code:** Design your code such that it is easy to write unit and integration tests for it. This often
  involves dependency injection, avoiding static methods where state is involved, and keeping logic separated from side
  effects. Think about how you will test a piece of code *before* you write it.
* **Prioritize Readability and Simplicity:** Complex problems often require complex solutions, but the implementation
  should be as simple and readable as possible. Refactor complex methods into smaller, well-named functions. Use
  meaningful variable names. Write code that expresses its intent clearly.
* **Consider Performance:** Be mindful of performance bottlenecks. Understand the time and space complexity of your
  algorithms. Optimize critical paths, but avoid premature optimization. Use profiling tools when necessary.
* **Focus on Security:** Implement security best practices from the start. Understand common vulnerabilities (e.g.,
  OWASP Top 10) and guard against them. Sanitize inputs, escape outputs, use secure authentication/authorization
  mechanisms, and handle sensitive data carefully.
* **Learn from Others (Code Review):** Treat code review not just as a gatekeeping step but as a learning opportunity.
  Both reviewing others' code and having your code reviewed are invaluable for skill growth. Provide constructive
  feedback and be open to receiving it.
* **Deep Dive into Technologies:** Understand the underlying mechanisms of the technologies you use. How does the JVM
  work? How does React's reconciliation process function? How does the database handle transactions and indexing? Deeper
  knowledge allows you to write more efficient and correct code and troubleshoot issues effectively.
* **Refactoring as a Habit:** Regularly refactor code to improve its design, readability, and maintainability, even if
  it's currently working. Small, continuous improvements prevent the accumulation of technical debt.
* **Effective Use of Tools:** Master your IDE, version control system (Git), build tools (Maven/Gradle, npm/yarn),
  testing frameworks, and debugging tools. Efficient tool usage significantly boosts productivity.
* **Understand Concurrency and Parallelism:** For applications handling multiple requests or background tasks,
  understand how to write thread-safe code and manage concurrent operations effectively to avoid race conditions and
  deadlocks. (Applicable for Backend/Mobile development)

## 7. Testing

Comprehensive testing is non-negotiable for delivering a reliable application.

* **Unit Tests:** Write tests for the smallest testable parts of your application. Aim for high code coverage of core
  logic.
* **Integration Tests:** Verify the interaction between different modules or services (e.g., testing the integration
  between your service layer and database).
* **End-to-End Tests (E2E):** Test the complete flow of the application from the user interface through the backend to
  the database.
* **User Acceptance Testing (UAT):** Involve end-users to validate that the application meets their requirements and
  works as expected in realistic scenarios.
* **Automated Testing:** Prioritize test automation to enable continuous integration and delivery. Write tests that are
  repeatable, reliable, and fast.
* **Framework Restriction:** **Do not use the Mockito framework or generic mocking mechanisms (`mock`
  functions/libraries) for writing tests.** All testing should adhere to the project's defined testing strategy and
  approved frameworks, focusing on the behavior of actual components rather than mocked dependencies, as per project
  requirements.

## 8. Documentation

Maintaining clear and up-to-date documentation is vital for team collaboration and long-term project maintainability.

* Create and maintain documentation for APIs (e.g., using OpenAPI/Swagger), database schemas, system architecture, and
  detailed feature designs.
* Develop user guides, deployment guides, and troubleshooting guides.
* Utilize in-code documentation comments extensively.
* Ensure documentation is easily accessible and regularly updated to reflect code changes.
* **System Output and Related Communication Language:** All text output generated by the system, whether displayed to
  the user or recorded internally, such as user interface (UI) text, error messages, log messages, and all related
  communication, including code comments and various development documents (design specifications, guides, etc.), must
  be written in **Korean**. This is to maintain consistency and facilitate clear understanding among team members.
