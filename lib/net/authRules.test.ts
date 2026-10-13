import assert from "node:assert/strict";
import test from "node:test";
import {
  AUTH_EMAIL_DOMAIN,
  friendlyAuthError,
  normaliseUsername,
  usernameToEmail,
  validatePassword,
  validateUsername,
} from "./authRules";

test("usernames are normalised and mapped to a stable email", () => {
  assert.equal(normaliseUsername("  @MindTheGap "), "MindTheGap");
  assert.equal(usernameToEmail("@MindTheGap"), `mindthegap@${AUTH_EMAIL_DOMAIN}`);
  assert.equal(usernameToEmail("mindthegap"), usernameToEmail("MINDTHEGAP"));
});

test("username validation", () => {
  assert.equal(validateUsername("mind_the_gap"), null);
  assert.equal(validateUsername("@alex"), null);
  assert.ok(validateUsername(""));
  assert.ok(validateUsername("ab"));
  assert.ok(validateUsername("has space"));
  assert.ok(validateUsername("a".repeat(21)));
});

test("password validation", () => {
  assert.equal(validatePassword("tube-delays-again"), null);
  assert.ok(validatePassword("short"));
  assert.ok(validatePassword("Password123"));
  assert.ok(validatePassword("12345678"));
});

test("auth errors are friendly", () => {
  assert.equal(friendlyAuthError("User already registered", "signup"), "That username is taken. Try another");
  assert.equal(friendlyAuthError("Invalid login credentials", "login"), "Wrong username or password");
  const notSetUp = "Accounts aren't set up yet. Play as a guest for now";
  assert.equal(friendlyAuthError("email rate limit exceeded", "signup"), notSetUp);
  assert.equal(friendlyAuthError("Email not confirmed", "login"), notSetUp);
  assert.equal(friendlyAuthError('Email address "alex@players.londonlife.app" is invalid', "signup"), notSetUp);
});
