import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { ForgotPasswordForm } from "./ForgotPasswordForm";
import { ResetPasswordForm } from "./ResetPasswordForm";

export * from "./constants";
export * from "./PasswordToggle";
export * from "./LoginForm";
export * from "./SignupForm";
export * from "./ForgotPasswordForm";
export * from "./ResetPasswordForm";

export const AuthForms = {
  LoginForm,
  SignupForm,
  ForgotPasswordForm,
  ResetPasswordForm,
};

export default AuthForms;
