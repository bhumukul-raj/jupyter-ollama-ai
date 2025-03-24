import re
import ast
import json
import sys
from typing import List, Dict, Any, Optional, Tuple, Set

class CodeAnalyzer:
    """Analyzes code to extract imports and data science related information."""
    
    def __init__(self, code: str):
        """Initialize with the code to analyze.
        
        Args:
            code: The Python code to analyze
        """
        self.code = code
        self.is_data_science = False
        self.data_science_libraries = set()
        self.data_science_functions = set()
        self.imported_modules = {}
        self.variables = {}
        self.dataframes = set()
        self.plots = set()
        self.models = set()
        
        # Keywords that identify data science code
        self.data_science_keywords = {
            'modules': {
                'pandas', 'numpy', 'matplotlib', 'seaborn', 'sklearn', 'scikit-learn',
                'tensorflow', 'torch', 'keras', 'scipy', 'statsmodels', 'xgboost',
                'lightgbm', 'plotly', 'bokeh', 'altair', 'geopandas', 'spacy',
                'nltk', 'gensim', 'transformers', 'pymc', 'prophet'
            },
            'aliases': {
                'pd': 'pandas', 'np': 'numpy', 'plt': 'matplotlib.pyplot',
                'sns': 'seaborn', 'tf': 'tensorflow', 'sk': 'sklearn'
            },
            'functions': {
                'plot', 'scatter', 'hist', 'bar', 'pie', 'boxplot', 'heatmap',
                'describe', 'corr', 'fit', 'predict', 'transform', 'train_test_split',
                'cross_val_score', 'mean_squared_error', 'accuracy_score'
            },
            'classes': {
                'DataFrame', 'Series', 'LinearRegression', 'LogisticRegression',
                'RandomForestClassifier', 'RandomForestRegressor', 'GradientBoostingClassifier',
                'KMeans', 'PCA', 'TfidfVectorizer', 'CountVectorizer'
            }
        }
        
        # Try to parse and analyze the code
        try:
            self.analyze()
        except SyntaxError:
            # If we can't parse the code, do a simpler analysis
            self.simple_analyze()
    
    def analyze(self):
        """Analyze the code using ast to extract imports and data science patterns."""
        try:
            tree = ast.parse(self.code)
            
            # Analyze imports
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for name in node.names:
                        self.imported_modules[name.asname or name.name] = name.name
                        if name.name in self.data_science_keywords['modules']:
                            self.data_science_libraries.add(name.name)
                            self.is_data_science = True
                
                elif isinstance(node, ast.ImportFrom):
                    for name in node.names:
                        module = f"{node.module}.{name.name}" if node.module else name.name
                        self.imported_modules[name.asname or name.name] = module
                        if node.module in self.data_science_keywords['modules']:
                            self.data_science_libraries.add(node.module)
                            self.is_data_science = True
                
                # Identify variable assignments
                elif isinstance(node, ast.Assign):
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            # Check if it's a DataFrame creation
                            if isinstance(node.value, ast.Call):
                                func = node.value.func
                                if isinstance(func, ast.Attribute):
                                    if func.attr == 'DataFrame' and isinstance(func.value, ast.Name):
                                        module = func.value.id
                                        if module in self.imported_modules and self.imported_modules[module] == 'pandas':
                                            self.dataframes.add(target.id)
                                            self.is_data_science = True
                                
                # Identify calls to common data science functions
                elif isinstance(node, ast.Call):
                    if isinstance(node.func, ast.Attribute):
                        # Check for method calls like pd.read_csv, df.describe, plt.plot
                        obj_name = ''
                        if isinstance(node.func.value, ast.Name):
                            obj_name = node.func.value.id
                            method_name = node.func.attr
                            
                            # Check for pandas/numpy methods
                            if obj_name in self.imported_modules:
                                module = self.imported_modules[obj_name]
                                if module in ('pandas', 'numpy', 'matplotlib.pyplot', 'seaborn'):
                                    self.data_science_functions.add(f"{obj_name}.{method_name}")
                                    self.is_data_science = True
                            
                            # Check for plotting functions
                            if (obj_name in ('plt', 'matplotlib') or 
                                method_name in self.data_science_keywords['functions']):
                                self.plots.add(f"{obj_name}.{method_name}")
                                self.is_data_science = True
                            
                            # Check for model training
                            if method_name in ('fit', 'predict', 'transform'):
                                self.models.add(obj_name)
                                self.is_data_science = True
                    
                    # Check for direct function calls
                    elif isinstance(node.func, ast.Name):
                        func_name = node.func.id
                        if func_name in self.data_science_keywords['functions']:
                            self.data_science_functions.add(func_name)
                            self.is_data_science = True
            
            # Do additional analysis using simple pattern matching for robustness
            self.simple_analyze()
            
        except SyntaxError as e:
            # Fall back to simple analysis if ast parse fails
            print(f"Syntax error in code: {e}")
            self.simple_analyze()
    
    def simple_analyze(self):
        """Use regex pattern matching for a simpler analysis."""
        # Look for common data science imports
        import_patterns = [
            r'import\s+(\w+)',
            r'from\s+(\w+)\s+import',
            r'import\s+(\w+)\s+as\s+(\w+)'
        ]
        
        for pattern in import_patterns:
            matches = re.findall(pattern, self.code)
            for match in matches:
                module = match[0] if isinstance(match, tuple) else match
                if module in self.data_science_keywords['modules']:
                    self.data_science_libraries.add(module)
                    self.is_data_science = True
        
        # Look for data science aliases
        for alias, module in self.data_science_keywords['aliases'].items():
            if re.search(r'\b' + re.escape(alias) + r'\.\w+', self.code):
                self.data_science_libraries.add(module)
                self.is_data_science = True
        
        # Look for common data science functions
        for func in self.data_science_keywords['functions']:
            if re.search(r'\b' + re.escape(func) + r'\(', self.code):
                self.data_science_functions.add(func)
                self.is_data_science = True
        
        # Look for common data science classes
        for cls in self.data_science_keywords['classes']:
            if re.search(r'\b' + re.escape(cls) + r'\(', self.code):
                self.data_science_functions.add(cls)
                self.is_data_science = True
    
    def get_summary(self) -> Dict[str, Any]:
        """Get a summary of the analysis.
        
        Returns:
            Dictionary with analysis results
        """
        return {
            'is_data_science': self.is_data_science,
            'data_science_libraries': list(self.data_science_libraries),
            'data_science_functions': list(self.data_science_functions),
            'imports': self.imported_modules,
            'dataframes': list(self.dataframes),
            'plots': list(self.plots),
            'models': list(self.models)
        }

def extract_import_context(code: str) -> List[str]:
    """Extract import statements from code.
    
    Args:
        code: The Python code to analyze
    
    Returns:
        List of import statements
    """
    import_lines = []
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                line_number = getattr(node, 'lineno', 0)
                end_line_number = getattr(node, 'end_lineno', line_number)
                
                # Get the original source lines
                code_lines = code.splitlines()
                if 0 < line_number <= len(code_lines) and 0 < end_line_number <= len(code_lines):
                    for i in range(line_number - 1, end_line_number):
                        import_lines.append(code_lines[i])
    except SyntaxError:
        # Fall back to regex if AST parsing fails
        pattern = r'^(?:from\s+\S+\s+import\s+.*|import\s+.*)$'
        import_lines = [line for line in code.splitlines() if re.match(pattern, line.strip())]
    
    return import_lines

def extract_variable_definitions(code: str, var_name: str) -> List[str]:
    """Extract the definition of a specific variable from code.
    
    Args:
        code: The Python code to analyze
        var_name: The variable name to extract
    
    Returns:
        List of lines defining the variable
    """
    definition_lines = []
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, ast.Assign):
                for target in node.targets:
                    if isinstance(target, ast.Name) and target.id == var_name:
                        line_number = getattr(node, 'lineno', 0)
                        end_line_number = getattr(node, 'end_lineno', line_number)
                        
                        # Get the original source lines
                        code_lines = code.splitlines()
                        if 0 < line_number <= len(code_lines) and 0 < end_line_number <= len(code_lines):
                            for i in range(line_number - 1, end_line_number):
                                definition_lines.append(code_lines[i])
    except SyntaxError:
        # Fall back to regex if AST parsing fails
        pattern = r'^' + re.escape(var_name) + r'\s*='
        definition_lines = [line for line in code.splitlines() if re.search(pattern, line.strip())]
    
    return definition_lines

def enrich_context(code: str, question: str) -> Dict[str, Any]:
    """Enrich the code context with additional information based on the question.
    
    Args:
        code: The Python code to analyze
        question: The question asked about the code
    
    Returns:
        Dictionary with enriched context information
    """
    # Analyze the code
    analyzer = CodeAnalyzer(code)
    summary = analyzer.get_summary()
    
    # Extract imports for context
    imports = extract_import_context(code)
    
    # Look for variable names in the question
    var_pattern = r'\b([a-zA-Z_][a-zA-Z0-9_]*)\b'
    potential_vars = re.findall(var_pattern, question)
    
    # Filter out common English words and Python keywords
    common_words = {
        'the', 'this', 'that', 'what', 'why', 'how', 'is', 'are', 'does', 'do',
        'code', 'function', 'mean', 'line', 'lines', 'file', 'print', 'show',
        'return', 'true', 'false', 'none', 'import', 'from', 'class', 'def',
        'for', 'while', 'if', 'else', 'elif', 'try', 'except', 'finally',
        'with', 'as', 'and', 'or', 'not', 'in', 'is'
    }
    
    # Get Python keywords
    python_keywords = set(dir(__builtins__))
    
    # Filter variables
    filtered_vars = [var for var in potential_vars 
                     if var not in common_words 
                     and var not in python_keywords
                     and len(var) > 1]  # Skip single letter variables except in specific cases
    
    # Add single letter variables that are common in data science
    if analyzer.is_data_science:
        ds_single_vars = {'X', 'y', 'df', 'x', 'z'}
        for var in ds_single_vars:
            if var in question and var not in filtered_vars:
                filtered_vars.append(var)
    
    # Extract variable definitions
    var_definitions = {}
    for var in filtered_vars:
        definition = extract_variable_definitions(code, var)
        if definition:
            var_definitions[var] = definition
    
    return {
        'summary': summary,
        'imports': imports,
        'variables_in_question': list(set(filtered_vars)),
        'variable_definitions': var_definitions,
        'code_length': len(code.splitlines()),
        'is_data_science': analyzer.is_data_science
    }

def format_for_ollama(code: str, question: str, cell_type: str = "code") -> Dict[str, Any]:
    """Format code and context for Ollama API.
    
    Args:
        code: The code to analyze
        question: The question about the code
        cell_type: The cell type (code or markdown)
    
    Returns:
        Dictionary with formatted context information
    """
    if cell_type == "markdown":
        return {
            "cell_type": "markdown",
            "content": code,
            "question": question
        }
    
    # For code cells, do more analysis
    context = enrich_context(code, question)
    
    # Format the final context
    result = {
        "cell_type": "code",
        "content": code,
        "question": question,
        "analysis": {
            "is_data_science": context["is_data_science"],
            "imports": context["imports"],
            "code_length": context["code_length"]
        }
    }
    
    # Add variables mentioned in the question if any
    if context["variables_in_question"]:
        result["analysis"]["variables_mentioned"] = context["variables_in_question"]
        result["analysis"]["variable_definitions"] = context["variable_definitions"]
    
    # Add data science specific information if relevant
    if context["summary"]["is_data_science"]:
        result["analysis"]["data_science"] = {
            "libraries": context["summary"]["data_science_libraries"],
            "functions": context["summary"]["data_science_functions"],
            "dataframes": context["summary"]["dataframes"],
            "plots": context["summary"]["plots"],
            "models": context["summary"]["models"]
        }
    
    return result 