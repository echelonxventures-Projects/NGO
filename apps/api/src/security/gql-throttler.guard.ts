import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * Rate-limit guard that also understands GraphQL execution contexts. The base ThrottlerGuard
 * assumes an HTTP request (reads `req.ip`); for GraphQL we extract the underlying Express
 * request/response from the Apollo context instead.
 */
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  getRequestResponse(context: ExecutionContext): { req: Record<string, unknown>; res: Record<string, unknown> } {
    if (context.getType<'graphql'>() === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      const ctx = gqlCtx.getContext<{ req: { res?: unknown } }>();
      return { req: ctx.req as never, res: (ctx.req?.res ?? {}) as never };
    }
    return super.getRequestResponse(context);
  }
}
