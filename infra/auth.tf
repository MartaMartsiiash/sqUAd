# Host sign-in: a Cognito user pool with email + password and, optionally, Google.
# The Lite tier with the classic hosted UI is free up to 10,000 monthly users.

resource "aws_cognito_user_pool" "main" {
  name                     = "${var.project_name}-users"
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  admin_create_user_config {
    allow_admin_create_user_only = false # self sign-up stays on
  }

  username_configuration {
    case_sensitive = false
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_uppercase = false
    require_numbers   = true
    require_symbols   = false
  }
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${data.aws_caller_identity.current.account_id}"
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "aws_cognito_identity_provider" "google" {
  count = local.has_google ? 1 : 0

  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "openid email profile"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
  }

  lifecycle {
    ignore_changes = [provider_details] # Cognito adds its own endpoints after create
  }
}

resource "aws_cognito_user_pool_client" "web" {
  name         = "${var.project_name}-web"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret                      = false # a browser app cannot keep a secret; it uses PKCE
  prevent_user_existence_errors        = "ENABLED"
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email", "profile"]
  supported_identity_providers         = local.has_google ? ["COGNITO", "Google"] : ["COGNITO"]

  callback_urls = [for url in local.site_urls : "${url}/auth/callback"]
  logout_urls   = [for url in local.site_urls : "${url}/"]

  explicit_auth_flows = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]

  access_token_validity  = 12
  id_token_validity      = 12
  refresh_token_validity = 30
  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  depends_on = [aws_cognito_identity_provider.google]
}

locals {
  has_google = var.google_client_id != ""

  cloudfront_url = "https://${aws_cloudfront_distribution.site.domain_name}"

  # With an own domain the site answers on both addresses; sign-in and the API accept both.
  site_url = local.domain_active ? "https://${var.domain_name}" : local.cloudfront_url

  site_urls = distinct(concat([local.site_url, local.cloudfront_url], var.local_dev_urls))
}
