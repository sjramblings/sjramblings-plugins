# sjramblings-plugins: the marketplace and the plugins it lists

default:
    @just --list

# claude plugin validate on the marketplace and every plugin
validate:
    claude plugin validate .
    claude plugin validate plugins/motion-studio

# end to end: make a studio in a temp dir, run its gate, preview the theme, draft the example clip
e2e dir="/tmp/motion-studio-e2e":
    rm -rf {{dir}}
    bun plugins/motion-studio/scripts/studio.ts init {{dir}}
    cd {{dir}} && just check && just theme-check sjramblings && just theme-preview sjramblings
    cd {{dir}} && just draft ac-01-support-memory --format 4x5
    ffprobe -v error -show_entries format=duration -of csv=p=0 {{dir}}/out/ac-01-support-memory/4x5.mp4

# bump the motion-studio version, validate, commit and tag motion-studio--v<version> (push is separate)
release version:
    @git diff --quiet && git diff --cached --quiet || (echo "commit or stash your changes first" && exit 1)
    bun -e 'const p = "plugins/motion-studio/.claude-plugin/plugin.json"; const j = await Bun.file(p).json(); j.version = process.argv[1]; await Bun.write(p, JSON.stringify(j, null, 2) + "\n")' {{version}}
    just validate
    git commit -am "motion-studio {{version}}"
    git tag "motion-studio--v{{version}}"
    @echo "tagged motion-studio--v{{version}}. Push with: git push && git push --tags"

# client terms must never appear anywhere in the tree. The terms live in .guard-terms
# (one regex, untracked) so the public repo never names them.
guard:
    @test -f .guard-terms || (echo "no .guard-terms file: guard skipped" && exit 0)
    @test ! -f .guard-terms || ! git grep -niE "$(cat .guard-terms)" -- .
