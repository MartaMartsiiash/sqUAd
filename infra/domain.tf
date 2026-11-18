# Own domain (optional), in two steps:
#   1. domain_name = "squad.pp.ua": Terraform requests a free HTTPS certificate
#      and prints the CNAME record that proves you own the domain (output
#      acm_validation). Add that record at your domain registrar.
#   2. attach_domain = true: once the certificate is issued, CloudFront answers
#      on the domain, and sign-in and the API accept it as well.
# CloudFront only reads certificates from us-east-1, hence the second provider.

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  default_tags {
    tags = {
      PROJECT_NAME = var.project_name
      ManagedBy    = "terraform"
    }
  }
}

locals {
  has_domain    = var.domain_name != ""
  domain_active = local.has_domain && var.attach_domain
  all_domains   = local.has_domain ? concat(var.extra_domains, [var.domain_name]) : []
  site_host     = local.has_domain ? local.all_domains[0] : ""
  domain_urls   = [for d in (local.domain_active ? local.all_domains : []) : "https://${d}"]
  acm_options   = local.has_domain ? aws_acm_certificate.site[0].domain_validation_options : []
  acm_records   = [for o in local.acm_options : "${o.resource_record_name} CNAME ${o.resource_record_value}"]
}

resource "aws_acm_certificate" "site" {
  count                     = local.has_domain ? 1 : 0
  provider                  = aws.us_east_1
  domain_name               = var.domain_name
  subject_alternative_names = var.extra_domains
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Waits until the certificate is issued, i.e. until the CNAME is visible in DNS.
resource "aws_acm_certificate_validation" "site" {
  count           = local.domain_active ? 1 : 0
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.site[0].arn
}
