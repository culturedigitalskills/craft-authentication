# Development Guide

This guide explains the workflow for contributing to the Craft Authentication project, from feature development to production deployment. The process is divided into two sections: one for **contributors** developing features, and one for **maintainers** managing deployments.

---

## For Contributors: Developing Features

### Getting Started

1. **Create a feature branch** from the latest `staging` branch:

    ```bash
    git checkout staging
    git pull origin staging
    git checkout -b feature/your-feature-name
    ```

    Use descriptive branch names (e.g., `feature/foto-upload`, `fix/login-redirect`).

2. **Set up the development environment** on your local machine:
    - Follow the project's setup instructions in the README
    - Ensure you have Docker, Node.js, and pnpm installed

3. **Develop your feature** with the local dev deployment:
    - Your local environment mirrors the staging environment
    - Testing locally usually means it will work on the server

### Keeping Your Branch Up to Date

While you develop, the `staging` branch may receive updates from other contributors:

1. **Regularly merge changes from staging** into your feature branch:

    ```bash
    git fetch origin
    git merge origin/staging
    ```

    This prevents merge conflicts and ensures your feature is compatible with latest changes.

2. **GitHub will block merging** if your branch is behind `staging`:
    - GitHub will notify you if you're out of sync
    - Use the merge command above to stay current

### API Data Validation

If your feature includes new API endpoints or modifies existing ones:

1. **Define Zod schemas** for all request and response data:
    - Create schemas in the appropriate validation file (found in `/lib/validations`)
    - Use Zod to validate incoming requests before processing
    - Document expected data types and constraints
    - This ensures consistent data format and makes API contracts explicit

2. **Example**:

    ```typescript
    import { z } from 'zod'

    export const CreateFeatureSchema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
    })

    export type CreateFeature = z.infer<typeof CreateFeatureSchema>
    ```

### Testing Before Submitting a PR

1. **Test the deployment locally** before creating a pull request:

    ```bash
    pnpm test-deploy
    ```

    This runs the same build script used on the server.

2. **Verify the build succeeds**:
    - If the build works locally, it usually works on the server too
    - Check for any errors or warnings
    - Ensure the service starts and containers are running

3. **Test your feature** on your local machine:
    - The website should be accessible on the port configured in `.env.production`
    - Test all the functionality you've added or changed

### Updating Documentation

Before submitting your PR, check if your feature requires setup changes:

1. **Update MIGRATION.md** if needed:
    - If your feature requires changes to `.env` or other external setup files, add those requirements
    - Document any new variables or configuration options
    - Include instructions for manual setup steps on staging or production
    - This helps maintainers deploy your feature without surprises

2. **Example MIGRATION.md entry**:

    ```markdown
    ## Version X.X.X

    ### New Features

    - Added photo upload functionality

    ### Configuration Changes

    - Add `UPLOAD_MAX_SIZE=10485760` (10MB) to `.env`
    - Add `UPLOAD_STORAGE_PATH=/var/uploads` and create the directory
    ```

3. **Keep it brief**:
    - Only document manual steps that aren't handled by migrations
    - The version number will be updated by maintainers

4. **Update README.md API documentation**:
    - If you add, modify, or remove API endpoints, update the "API Endpoints" section in README.md
    - Include the HTTP method, route, and brief description of what the endpoint does
    - Document any required parameters or query strings
    - Example:

        ```markdown
        ### Your Feature

        - `GET /api/your-feature` - List all your feature items
        - `POST /api/your-feature` - Create new item
        - `PUT /api/your-feature/:id` - Update item
        - `DELETE /api/your-feature/:id` - Delete item
        ```

### Creating a Pull Request

A Pull Request (PR) is how you propose changes to be merged into the project. Here's how to create one:

1. **Merge the latest staging into your feature branch**:

    ```bash
    git fetch origin
    git merge origin/staging
    ```

    This ensures your changes are compatible with the latest code and prevents merge conflicts in the PR.

2. **Test after the merge**:

    ```bash
    pnpm test-deploy
    ```

    Run the deployment test to ensure the merge didn't break anything. If there are issues:
    - Fix any conflicts or problems
    - Test again with `pnpm test-deploy`
    - Commit and push your fixes

3. **Push your feature branch to GitHub**:

    ```bash
    git push origin feature/your-feature-name
    ```

    This uploads your changes to the remote repository.

4. **Go to the GitHub repository**:
    - Visit https://github.com/culturedigitalskills/craft-authentication
    - You should see a notification or button suggesting "Compare & pull request" for your recently pushed branch
    - If not, click the "Pull requests" tab at the top

5. **Create the PR**:
    - Click "New pull request" or "Compare & pull request"
    - Select `staging` as the base branch (where your changes will be merged)
    - Select your feature branch as the compare branch (your changes)
    - Click "Create pull request"

6. **Fill in the PR details**:
    - **Title**: A clear, concise summary of your changes (e.g., "Add photo upload feature")
    - **Description**: Use the template provided or write:
        - What problem does this solve?
        - What changes did you make?
        - How can someone test this?
        - Any notes for reviewers (breaking changes, config updates, etc.)

7. **Example PR description**:

    ```markdown
    ## Description

    Added photo upload functionality to user profiles

    ## Changes

    - Added photo upload form to profile page
    - Integrated with AWS S3 for storage
    - Added Zod schema validation for uploads

    ## Testing Steps

    1. Navigate to your profile page
    2. Click "Upload Photo"
    3. Select an image (JPG, PNG, max 5MB)
    4. Click "Upload" and verify it appears in your profile

    ## Migration Notes

    - Added environment variable `S3_BUCKET` to .env - see MIGRATION.md for details
    - Run `prisma migrate deploy` for new database schema

    ## Checklist

    - [x] Tests pass locally (`pnpm test-deploy`)
    - [x] MIGRATION.md updated
    - [x] API endpoints have Zod schemas
    - [x] Feature tested locally
    ```

8. **Click "Create pull request"**:
    - Your PR is now visible to maintainers
    - GitHub will run automated checks
    - Wait for a maintainer to review and test your changes

9. **Address feedback**:
    - If a maintainer requests changes, make those changes on your local branch
    - Push the changes: `git push origin feature/your-feature-name`
    - The PR will automatically update with your new commits

10. **Important: Avoid deploying directly**:
    - Do not push to `staging` or `main` directly
    - Always use pull requests for all changes
    - This ensures proper code review and prevents accidental deployments

---

## For Maintainers: Managing Deployments

### Understanding the Branch Protection Rules

- **GitHub branch protection** is enabled for `staging` and `main`
- Only selected maintainers have push permissions
- All changes must go through pull requests
- This prevents accidental deployments and malicious changes

### Server Deployment Details

**Deploy Script**: The server runs `pnpm test-deploy` on every push to `staging` or `main`

**What Happens During Deployment**:

1. Git fetches the latest code
2. The Docker containers are shut down
3. Everything is rebuilt from scratch
4. New containers start with the updated code
5. Users will see a "502 Bad Gateway" error during rebuild

**Rebuild Duration**: 1-10 minutes

- Some tasks may appear to do nothing for several minutes but will continue
- Do not interrupt the process

### Reviewing and Testing a Pull Request

Before merging a PR to `staging`:

1. **Review the code** in the GitHub PR:
    - Ensure the code quality meets project standards
    - Check for security issues
    - Verify the feature matches the description

2. **Create a temporary test branch** (local only, will be discarded):

    ```bash
    git fetch origin
    git checkout -b test/feature-branch origin/staging
    ```

    This creates a new, discardable local branch (or copy) from the latest `staging` without modifying your local staging branch.

    **Important**: Never push the test branch upstream
    - it should be strictly local and discardable.
    - It is just meat for testing the PR before accepting it
    - If changes are needed, notify the contributor.

3. **Merge the feature branch into your test branch**:

    ```bash
    git merge origin/your-feature-branch
    ```

    If the merge fails, you can simply delete this test branch and try again without affecting your workspace.

4. **Run the deployment test**:

    ```bash
    pnpm test-deploy
    ```

    Verify that the build completes without errors.

5. **If tests pass**, delete the test branch:

    ```bash
    git checkout develop
    git branch -D test/feature-branch
    ```

    You're now ready to approve the PR.

6. **If tests fail**, investigate the issue:
    - Notify the contributor of the problem
    - Ask them to fix it on their feature branch and push updates
    - If you want to make changes yourself
        - create a commit on your local branch (do not push upstream)
        - check out the feature-branch
        - cherry-pick your commit on the feature-branch (locally)
        - push the changes to the feature-branch upstream
        - Delete the test branch and start over.
    - Delete the test branch: `git branch -D test/feature-branch`

7. **Merge and approve** the PR on GitHub:
    - This triggers automatic deployment to the staging server
    - The server will begin rebuilding

### Monitoring the Staging Deployment

After merging to `staging`, a maintainer monitors the deployment:

1. **Access the staging server**:
    - A maintainer will SSH into the staging server to monitor deployment
    - Contact a maintainer for server access instructions

2. **Monitor deployment progress**:
    - Maintainers follow the deployment logs using appropriate monitoring tools
    - Watch for error messages or failures
    - Follow the progress until the deployment completes

3. **Check container status**:
    - Maintainers verify that all Docker containers started successfully
    - They review any errors in container logs
    - Contact a maintainer if issues occur

### Testing on Staging

Once the deployment completes:

1. **Verify no deployment errors**:
    - Check the logs for any error messages
    - Ensure all containers started successfully

2. **Check database migrations**:
    - Verify that all database migrations executed properly
    - Review any schema changes in the logs

3. **Test the feature**:
    - Access the staging site
    - Test the new feature thoroughly
    - Look for any server-side issues
    - Check the `/api/info` endpoint to confirm the version matches

4. **Verify configurations** are correct:
    - Check `.env` variables if any were changed
    - Verify any other config files are properly set

**Important**: Staging and production environments are **not identical**, especially regarding configuration files. Always test thoroughly on staging before promoting to production. Take note of any needed change in the staging environment and apply similar changes to production to ensure the deployment runs smoothly.

### Promoting to Production

Once staging is verified and working correctly:

1. **Merge** `staging` to `main`
2. **Production deployment**:
    - A maintainer monitors the production deployment process
    - Similar monitoring and testing as staging occurs
    - Contact a maintainer for deployment status updates
3. **Verify production** is working correctly:
    - Test the feature in the live environment
    - Report any issues to maintainers immediately

### Version Management and Documentation

#### Semantic Versioning Rules

We follow [Semantic Versioning](https://semver.org/) (MAJOR.MINOR.PATCH):

- **MAJOR** (e.g., **2**.0.0): Breaking changes
    - Incompatible API changes
    - Significant changes to configuration files
    - Database schema changes that require manual intervention
    - Changes to authentication/authorization logic

- **MINOR** (e.g., 1.**2**.0): New features (backward compatible)
    - New API endpoints
    - New optional configuration options
    - Database migrations (automatic, no manual steps required)
    - New functionality for users

- **PATCH** (e.g., 1.1.**3**): Bug fixes (backward compatible)
    - Bug fixes
    - Performance improvements
    - Documentation updates
    - Minor refactoring

#### Updating Version and Documentation

1. **Update the version** in `package.json`:
    - Only maintainers update this (typically when merging to `staging` or `main`)
    - Increment based on the type of changes in the PR
    - Maintainers check the `/api/info` endpoint to confirm the new version is reported

2. **Maintain MIGRATION.md**:
    - After deplyoing to staging, make sure that `MIGRATION.md` contains all relevant changes
        - Document any manual configuration updates needed for new versions
        - Include instructions for database migration steps (if any)
    - This helps both developers and maintainers understand what needs to be updated when deploying new versions
    - This is especially useful for production deployments where configuration may differ from staging
    - Entries should be organized by version with clear sections for configuration changes, new features, and breaking changes

### Summary of the Deployment Flow

```
feature branch (local testing)
        ↓
   Pull Request to staging
        ↓
   Maintainer review + local merge test
        ↓
   Merge to staging → Auto-deploy to staging server
        ↓
   Maintainer tests on staging (24-72 hours typically)
        ↓
   Pull Request to main
        ↓
   Verify staging is stable
        ↓
   Merge to main → Auto-deploy to production
        ↓
   Production live!
```

---

## Common Commands Reference

### For Contributors

```bash
# Create and switch to feature branch
git checkout -b feature/your-feature-name

# Keep your branch updated
git fetch origin
git merge origin/staging

# Test deployment locally
pnpm test-deploy

# Push your branch and create a PR on GitHub
git push origin feature/your-feature-name
```

### For Maintainers

```bash
# Create a temporary test branch from origin/staging (local only)
git fetch origin
git checkout -b test/feature-branch origin/staging

# Merge the feature branch into test branch
git merge origin/feature-branch

# Run deployment test
pnpm test-deploy

# If successful, delete test branch and approve PR
git checkout main
git branch -D test/feature-branch

# If failed, delete test branch and notify contributor
# git branch -D test/feature-branch

# IMPORTANT: Never push the test branch upstream
# The test branch is strictly local and read-only
```

---

## Questions?

If you have questions about the development or deployment process, reach out to the project maintainers. We're happy to help!
