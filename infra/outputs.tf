output "site_url" {
  value = local.site_url
}

output "api_url" {
  value = trimsuffix(aws_lambda_function_url.api.function_url, "/")
}

output "site_bucket" {
  value = aws_s3_bucket.site.bucket
}

output "distribution_id" {
  value = aws_cloudfront_distribution.site.id
}

output "cognito_authority" {
  value = "https://cognito-idp.${var.region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.web.id
}

output "cognito_domain" {
  value = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.region}.amazoncognito.com"
}

output "google_redirect_uri" {
  description = "Add this to the Google OAuth client's authorized redirect URIs."
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.region}.amazoncognito.com/oauth2/idpresponse"
}

output "mono_webhook_url" {
  value     = "${trimsuffix(aws_lambda_function_url.api.function_url, "/")}/api/payments/monobank/${random_password.mono_webhook.result}"
  sensitive = true
}
