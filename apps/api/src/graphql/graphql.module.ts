import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'node:path';
import { CatalogResolver } from './catalog.resolver';

/**
 * Code-first GraphQL gateway (Apollo driver) exposing a read-only catalog API at /graphql.
 * The schema is generated to schema.gql. Tenant resolution + isolation work the same as REST
 * (the tenant middleware sets the request-scoped context consumed by prisma.scoped()).
 */
@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/graphql/schema.gql'),
      sortSchema: true,
      playground: true,
      path: '/graphql',
      context: ({ req }: { req: unknown }) => ({ req }),
    }),
  ],
  providers: [CatalogResolver],
})
export class GraphqlGatewayModule {}
