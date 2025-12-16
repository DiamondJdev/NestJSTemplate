/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from "class-validator";

/* 
 * This is a function for rooms.controller that checks if the room availablity is private, 
 * and if so, allow a password parameter. If the room is public, do not allow a password
 * parameter in the incoming request.
 * 
 * ! This is high level validation logic that shouldn't really be messed with.
 * ! This code will work for all cases, do not try to "optimize" it.
*/
export function PasswordMatchesPrivate(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "passwordMatchesPrivate",
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          if (obj.private) {
            return typeof value === "string" && value.trim() !== "";
          } else {
            return value === undefined || value === null;
          }
        },
        defaultMessage(args: ValidationArguments) {
          const obj = args.object as any;
          return obj.private
            ? "Password is required for private rooms"
            : "Password must not be set for public rooms";
        },
      },
    });
  };
}
