/**
 * supertest's Response.body is typed `any`, which trips
 * `@typescript-eslint/no-unsafe-member-access` on every `response.body.field`
 * access in test assertions. This narrows it to the shape the caller
 * expects at the point of use.
 */
export function typedBody<T>(response: { body: unknown }): T {
  return response.body as T;
}
