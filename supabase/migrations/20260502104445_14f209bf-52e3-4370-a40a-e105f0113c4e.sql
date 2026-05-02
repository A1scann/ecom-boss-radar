DELETE FROM public.sub_niches_live
WHERE name ~* '\y(raboteuse|dégauchisseuse|amplificateur|thunderbolt|stairlift|aquarium|midi|graveur|trancheuse|déshydrateur|tondeuse|tapis de course|tapis roulant|arbre à chat|scie sur table|tablette graphique|démonte|mécanicien|ventilateur toit|cnc bois|laser)\y'
   OR name ~ '[0-9]'
   OR length(name) > 38;