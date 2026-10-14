-- Eating and sleeping restore far more: hunger from food and energy from sleep are doubled.
-- Values mirror data/actions.json. perform_action grants the allowance from these, so checkpoint_needs accepts the bigger gains.
update actions set effects = '{"energy":150}'::jsonb where id = 'sleep';
update actions set effects = '{"energy":40}'::jsonb where id = 'nap';
update actions set effects = '{"hunger":70}'::jsonb where id = 'beans_on_toast';
update actions set effects = '{"hunger":44}'::jsonb where id = 'noodles';
update actions set effects = '{"hunger":110,"fun":15}'::jsonb where id = 'taste_of_home';
update actions set effects = '{"hunger":100,"fun":5}'::jsonb where id = 'fry_up';
update actions set effects = '{"hunger":30}'::jsonb where id = 'leftovers';
update actions set effects = '{"energy":44}'::jsonb where id = 'sofa_nap';
update actions set effects = '{"energy":48}'::jsonb where id = 'pass_out';
update actions set effects = '{"hunger":100,"fun":6}'::jsonb where id = 'jerk_box';
update actions set effects = '{"hunger":60,"fun":6}'::jsonb where id = 'bao';
update actions set effects = '{"hunger":28,"fun":10}'::jsonb where id = 'churros';
update actions set effects = '{"hunger":90,"fun":18,"social":6}'::jsonb where id = 'food_from_home_market';
update actions set effects = '{"hunger":70,"fun":4}'::jsonb where id = 'avo_toast';
update actions set effects = '{"social":25,"hunger":30}'::jsonb where id = 'tech_meetup';
update actions set effects = '{"hunger":100,"fun":8}'::jsonb where id = 'jollof_plate';
update actions set effects = '{"hunger":48}'::jsonb where id = 'patty';
update actions set effects = '{"hunger":90,"fun":6}'::jsonb where id = 'pho_bowl';
update actions set effects = '{"hunger":90,"fun":18,"social":6}'::jsonb where id = 'food_from_home_arcade';
update actions set effects = '{"hunger":60}'::jsonb where id = 'pret_sandwich';
update actions set effects = '{"hunger":44,"fun":16,"social":5}'::jsonb where id = 'picnic';
update actions set effects = '{"energy":44,"hygiene":-5}'::jsonb where id = 'grass_nap';
update actions set effects = '{"hunger":16}'::jsonb where id = 'crisps';
update actions set effects = '{"hunger":84}'::jsonb where id = 'chicken_chips';
update actions set effects = '{"hunger":80,"fun":4}'::jsonb where id = 'meal_deal';
update actions set effects = '{"hunger":20}'::jsonb where id = 'event_pigeon_pay';
