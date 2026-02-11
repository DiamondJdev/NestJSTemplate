# Logging Service Documentation

## Overview
The logging service has been implemented to log errors, important requests, and user statistics. It provides file-based logging with separate log files for different purposes.

## Features
- **File-based logging**: Logs are written to files in the `logs/` directory
- **Multiple log files**:
  - `combined.log` - All logs
  - `error.log` - Only error logs
  - `stats.log` - User statistics logs
- **Console output**: In development mode, logs are also printed to console with colors
- **Automatic HTTP request logging**: All HTTP requests are logged with method, URL, status code, duration, and user ID (if authenticated)

## Log Files Location
All log files are stored in the `logs/` directory at the project root. The directory is automatically created if it doesn't exist.

## Usage

### Injecting the Logger Service
In any service or controller, inject the `LoggerService`:

```typescript
import { LoggerService } from './modules/common/services/logger.service';

@Injectable()
export class MyService {
  constructor(private readonly logger: LoggerService) {}
  
  myMethod() {
    this.logger.log('This is an info message', 'MyService');
  }
}
```

### Logging Methods

#### General Logging
```typescript
// Info log
this.logger.log('User logged in successfully', 'AuthService');

// Warning log
this.logger.warn('API rate limit approaching', 'RateLimitService');

// Debug log
this.logger.debug('Processing request data', 'RequestProcessor');

// Error log
this.logger.error('Failed to connect to database', error.stack, 'DatabaseService');
```

#### HTTP Request Logging
Requests are automatically logged by the `LoggingInterceptor`. You don't need to manually log them.

The interceptor logs:
- HTTP method
- URL
- Status code
- Response time (in milliseconds)
- User ID (if authenticated)

#### User Statistics Logging
```typescript
// Log user actions for statistics
this.logger.logUserStats('login', userId, { 
  ip: request.ip, 
  userAgent: request.headers['user-agent'] 
});

this.logger.logUserStats('purchase', userId, { 
  productId: 'product-123', 
  amount: 99.99 
});

this.logger.logUserStats('profile_update', userId);
```

## Examples

### Example 1: Logging in a Service
```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../common/services/logger.service';

@Injectable()
export class UserService {
  constructor(private readonly logger: LoggerService) {}

  async createUser(userData: any) {
    try {
      this.logger.log(`Creating new user: ${userData.username}`, 'UserService');
      
      // Create user logic here
      
      this.logger.logUserStats('user_created', user.id, {
        username: user.username,
        role: user.role,
      });
      
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to create user: ${error.message}`,
        error.stack,
        'UserService'
      );
      throw error;
    }
  }
}
```

### Example 2: Logging in a Controller
```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { LoggerService } from '../common/services/logger.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly logger: LoggerService) {}

  @Post()
  create(@Body() productData: any) {
    this.logger.log(`Creating new product: ${productData.name}`, 'ProductsController');
    // Logic here
  }
}
```

## Configuration

The logging service is already configured globally in `main.ts`:
- The service is used as the application logger
- The logging interceptor is applied globally to all HTTP requests

## Log Format

Logs are formatted as:
```
2026-02-11T17:50:00.123Z [INFO][ServiceName] Message content {"metadata": "if any"}
```

Example log entries:
```
2026-02-11T17:50:00.123Z [INFO][Bootstrap] Server running on http://0.0.0.0:5200
2026-02-11T17:50:01.456Z [INFO][HTTP] GET /api/users 200 {"duration":"45ms","userId":"user-123"}
2026-02-11T17:50:02.789Z [ERROR][AuthService] Invalid credentials {"trace":"...stack trace..."}
2026-02-11T17:50:03.012Z [INFO][UserStats] User user-123 - login {"ip":"192.168.1.1"}
```

## Notes

- The `logs/` directory is already excluded in `.gitignore`
- In production, logs are only written to files (not console)
- In development, logs are shown in both console (with colors) and files
- All log files use UTF-8 encoding
