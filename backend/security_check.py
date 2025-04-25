import os
import requests
from review.code_review import review_directory

def check_vulnerabilities():
    # Get changed files from GitHub context
    changed_files = os.getenv('GITHUB_CHANGED_FILES', '').split(' ')
    
    # Run security analysis
    results = review_directory('.', output_format="json")
    
    # Post results as PR comment
    pr_number = os.getenv('GITHUB_PR_NUMBER')
    repo = os.getenv('GITHUB_REPOSITORY')
    token = os.getenv('GITHUB_TOKEN')
    
    if results:
        url = f'https://api.github.com/repos/{repo}/issues/{pr_number}/comments'
        headers = {
            'Authorization': f'token {token}',
            'Accept': 'application/vnd.github.v3+json'
        }
        data = {
            'body': f"Security Analysis Results:\n\n{results}"
        }
        requests.post(url, headers=headers, json=data)

if __name__ == "__main__":
    check_vulnerabilities()