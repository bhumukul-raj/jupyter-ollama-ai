# Code Improvement Tutorial

This tutorial will guide you through the process of using the Ollama JupyterLab AI Assistant to improve your code.

## Prerequisites

- JupyterLab with the Ollama JupyterLab AI Assistant extension installed
- Ollama running with a supported model (mistral or codellama recommended)
- A notebook with some Python code to improve

## Step 1: Open a Notebook

First, open a Jupyter notebook that contains code you want to improve. If you don't have one, create a new notebook and add a code cell with some suboptimal code.

Example code to improve:

```python
# A suboptimal function to find prime numbers
def find_primes(n):
    primes = []
    for i in range(2, n+1):
        is_prime = True
        for j in range(2, i):
            if i % j == 0:
                is_prime = False
                break
        if is_prime:
            primes.append(i)
    return primes

# Test the function
primes = find_primes(100)
print(primes)
```

## Step 2: Open the AI Assistant Panel

1. Click on the "Ollama AI Assistant" icon in the right sidebar.
2. If this is your first time using the assistant, you'll see an empty chat interface.

## Step 3: Switch to Improve Mode

1. At the top of the assistant panel, you'll see tabs for different modes: Chat, Analyze, and Improve.
2. Click on the "Improve" tab to switch to code improvement mode.

## Step 4: Select a Code Cell

1. Click on the code cell in your notebook that contains the code you want to improve.
2. The cell should be highlighted to indicate it's selected.

## Step 5: Request Code Improvement

1. In the AI Assistant panel, you'll see a button labeled "Improve Current Cell".
2. Click this button to ask the AI to analyze and improve your code.
3. The AI will start generating a response, which you'll see appear in the conversation area.

## Step 6: Review the Improvements

The AI will provide:
1. An explanation of what your code does
2. Identified issues or inefficiencies
3. Improved code
4. Explanations of the improvements made

Example improvement for the prime number function:

```python
def find_primes(n):
    """Find all prime numbers up to n using the Sieve of Eratosthenes algorithm."""
    if n < 2:
        return []
    
    # Initialize a list of booleans, assuming all numbers are prime
    sieve = [True] * (n + 1)
    sieve[0] = sieve[1] = False
    
    # Use Sieve of Eratosthenes algorithm
    for i in range(2, int(n**0.5) + 1):
        if sieve[i]:
            # Mark all multiples of i as non-prime
            for j in range(i*i, n + 1, i):
                sieve[j] = False
    
    # Return all indices that are marked as prime
    return [i for i in range(n + 1) if sieve[i]]

# Test the function
primes = find_primes(100)
print(primes)
```

## Step 7: Apply the Improved Code

1. If you're satisfied with the improvements, you can copy the improved code.
2. Replace the code in your notebook cell with the improved version.
3. Run the cell to ensure it works as expected.

## Step 8: Ask for Clarification

If you don't understand certain improvements or have questions:

1. Switch back to the "Chat" tab.
2. Ask specific questions about the improvements.
3. The AI will explain the reasoning behind the suggestions.

## Step 9: Further Refinements

You can continue to improve your code by:

1. Making additional changes based on the AI's suggestions
2. Selecting the modified cell
3. Switching back to the "Improve" tab
4. Clicking "Improve Current Cell" again for further refinements

## Tips for Getting Better Improvements

- **Be Specific**: If you have specific concerns, mention them in the Chat tab before requesting improvements
- **Provide Context**: Include comments in your code explaining what it's supposed to do
- **Start Simple**: Begin with smaller, focused code cells rather than large, complex ones
- **Try Different Models**: Some models may provide better code suggestions than others

## Advanced: Custom Improvement Prompts

For more targeted improvements, you can use the Chat tab with specific prompts:

- "Optimize this code for performance: [paste code]"
- "Make this code more readable: [paste code]"
- "Add proper error handling to this function: [paste code]"

By specifying what kind of improvements you're looking for, you can get more focused suggestions. 