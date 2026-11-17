terraform {
  required_version = ">= 1.6"

  # State is kept on the laptop that runs `make deploy` (see docs/adr/0003).
  # To move it to HCP Terraform like in Lab 7, add a `cloud {}` block here.

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.region

  # Every resource gets these tags, so Cost Explorer can show what sqUAd costs.
  default_tags {
    tags = {
      PROJECT_NAME = var.project_name
      ManagedBy    = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}
