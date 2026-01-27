#!/usr/bin/env python3
"""
Simple local test script for cw-mentor backend functions.
Tests basic functionality of each Cloud Function.
"""

import os
import sys
import json
import requests
from typing import Dict, Any

# Test configuration
FUNCTIONS = {
    'analysis': {
        'url': 'http://localhost:8080',
        'target': 'social_work_ai',
        'test_data': {
            'action': 'analyze',
            'transcript': [
                {'role': 'user', 'parts': 'Hi, I\'m from CPS. We got a call about your kids.'},
                {'role': 'model', 'parts': 'What? Who are you?'}
            ],
            'assessment': {
                'introduction': 'I did not introduce myself properly.',
                'reason': 'I stated there was a call but was vague.',
            }
        }
    },
    'mentorship': {
        'url': 'http://localhost:8081',
        'target': 'mentorship_ai',
        'test_data': {
            'message': 'What are the key principles of trauma-informed practice?',
            'history': []
        }
    },
    'simulation': {
        'url': 'http://localhost:8082',
        'target': 'simulation_ai',
        'test_data': {
            'message': 'Hello, my name is Sarah. I\'m a social worker. May I come in?',
            'scenario_id': 'cooper',
            'history': []
        }
    }
}

def test_function(name: str, config: Dict[str, Any]) -> bool:
    """Test a single Cloud Function."""
    print(f"\n{'='*60}")
    print(f"Testing {name.upper()} function")
    print(f"{'='*60}")
    
    url = config['url']
    test_data = config['test_data']
    
    try:
        print(f"Sending request to {url}...")
        print(f"Payload: {json.dumps(test_data, indent=2)[:200]}...")
        
        response = requests.post(
            url,
            json=test_data,
            headers={'Content-Type': 'application/json'},
            timeout=60
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            # For streaming responses, just check if we got data
            if name == 'analysis':
                content = response.text
                print(f"Response length: {len(content)} characters")
                print(f"First 200 chars: {content[:200]}...")
                if len(content) > 0:
                    print("✅ Analysis function working!")
                    return True
            else:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)[:300]}...")
                if data.get('success') or data.get('text'):
                    print(f"✅ {name.capitalize()} function working!")
                    return True
        else:
            print(f"❌ Error: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"❌ Connection failed. Is the function running on {url}?")
        print(f"   Start it with: functions-framework --target={config['target']} --port={url.split(':')[-1]} --debug")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False
    
    return False

def check_environment():
    """Check if required environment variables are set."""
    print("\n" + "="*60)
    print("Checking Environment Variables")
    print("="*60)
    
    required_vars = [
        'GOOGLE_CLOUD_PROJECT',
    ]
    
    optional_vars = [
        'VERTEX_AI_DATASTORE_ID',
        'VERTEX_RAG_CORPUS_ID',
        'VERTEX_RAG_CORPUS_ID_SCENARIOS',
        'DEBUG_STREAMING'
    ]
    
    all_good = True
    for var in required_vars:
        value = os.environ.get(var)
        if value:
            print(f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: NOT SET (required)")
            all_good = False
    
    for var in optional_vars:
        value = os.environ.get(var)
        if value:
            print(f"✅ {var}: {value[:50]}...")
        else:
            print(f"⚠️  {var}: NOT SET (optional, will use defaults)")
    
    return all_good

def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("CW-MENTOR LOCAL TESTING SCRIPT")
    print("="*60)
    
    # Check environment
    if not check_environment():
        print("\n⚠️  Warning: Some required environment variables are not set.")
        print("   Set them in your .env file or export them in your shell.")
        response = input("\nContinue anyway? (y/n): ")
        if response.lower() != 'y':
            sys.exit(1)
    
    # Test each function
    results = {}
    for name, config in FUNCTIONS.items():
        results[name] = test_function(name, config)
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    for name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{name.capitalize()}: {status}")
    
    total = len(results)
    passed = sum(results.values())
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")
        return 1

if __name__ == '__main__':
    sys.exit(main())
