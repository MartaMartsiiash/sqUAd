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

output "region" {
  value = var.region
}

output "api_function" {
  value = aws_lambda_function.api.function_name
}

output "acm_validation" {
  description = "Add this CNAME at your domain registrar (value with a dot at the end), then set attach_domain = true."
  value = local.has_domain ? [for o in aws_acm_certificate.site[0].domain_validation_options : {
    type  = o.resource_record_type
    name  = o.resource_record_name
    value = o.resource_record_value
  }] : []
}

output "domain_cname_target" {
  description = "Point your domain (CNAME, or ALIAS/ANAME for a bare domain) at this address."
  value       = aws_cloudfront_distribution.site.domain_name
}
