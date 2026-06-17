import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CourseGql {
  @Field() id!: string;
  @Field() slug!: string;
  @Field() title!: string;
  @Field({ nullable: true }) summary?: string;
  @Field(() => Int) price!: number;
  @Field() currency!: string;
}

@ObjectType()
export class ProductGql {
  @Field() id!: string;
  @Field() slug!: string;
  @Field() title!: string;
  @Field({ nullable: true }) description?: string;
  @Field(() => Int) price!: number;
  @Field() currency!: string;
}

@ObjectType()
export class EventGql {
  @Field() id!: string;
  @Field() slug!: string;
  @Field() title!: string;
  @Field() startsAt!: Date;
  @Field({ nullable: true }) location?: string;
}

@ObjectType()
export class CampaignGql {
  @Field() id!: string;
  @Field() slug!: string;
  @Field() title!: string;
  @Field(() => Int) goalAmount!: number;
  @Field(() => Int) raisedAmount!: number;
  @Field(() => Float) progressPct!: number;
}
