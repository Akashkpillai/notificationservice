import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        const method = request.method;
        const url = request.url;

        this.logger.log(`Request: ${method} ${url}`);

        const start = Date.now();

        return next.handle().pipe(
            tap(() => {
                const statusCode = response.statusCode;
                const duration = Date.now() - start;
                this.logger.log(`Response: ${method} ${url} ${statusCode} ${duration}ms`);
            }),
        );
    }
}