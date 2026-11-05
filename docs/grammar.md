# Grammar

```
query                 -> expr?
expr                  -> logical_or
logical_or            -> logical_and ('OR'? logical_and)*
logical_and           -> unary ('AND' unary)*
unary                 -> ('-' | '+')? primary
primary               -> group | str | quoted_str | plain_str | field
group                 -> '(' expr ')'
str                   -> quoted_str | plain_str
quoted_str            -> '"' `/\w/ '"'
plain_str             -> /\w/
field                 -> field_key ':' field_value
field_key             -> /\w/
field_value           -> /\w/
```